// Azure Function C# version of backend/utils/bscExcelParser.js.
// NuGet packages:
// - ClosedXML
// - Microsoft.NET.Sdk.Functions
// - Microsoft.PowerPlatform.Dataverse.Client
//
// Replace the Dataverse logical names in DataverseTableNames and DataverseColumns
// with the exact logical names from your environment before enabling SaveAsync.

using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Extensions.Logging;
using Microsoft.PowerPlatform.Dataverse.Client;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;

public static class BscExcelUploadFunction
{
    [FunctionName("UploadBscExcel")]
    public static async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "bsc/upload-excel")] HttpRequest req,
        ILogger log)
    {
        var file = req.Form.Files["file"];
        if (file == null || file.Length == 0)
        {
            return new BadRequestObjectResult(new { message = "Excel file is required." });
        }

        var fiscalYear = req.Form["fiscalYear"].FirstOrDefault();
        var month = req.Form["month"].FirstOrDefault();
        var saveToDataverse = string.Equals(req.Form["saveToDataverse"].FirstOrDefault(), "true", StringComparison.OrdinalIgnoreCase);

        await using var stream = file.OpenReadStream();
        var parseResult = BscExcelParser.ParseWorkbookWithMetadata(stream, new ParseOptions
        {
            FiscalYear = fiscalYear,
            Month = month
        });

        if (saveToDataverse)
        {
            var connectionString = Environment.GetEnvironmentVariable("DATAVERSE_CONNECTION_STRING");
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                return new BadRequestObjectResult(new { message = "DATAVERSE_CONNECTION_STRING is missing." });
            }

            using var serviceClient = new ServiceClient(connectionString);
            var saver = new DataverseBscScoreSaver(serviceClient);
            await saver.SaveAsync(parseResult.Scores, log);
        }

        return new OkObjectResult(new
        {
            scores = parseResult.Scores,
            accessCredentials = parseResult.AccessCredentials
        });
    }
}

public sealed class ParseOptions
{
    public string? FiscalYear { get; set; }
    public string? Month { get; set; }
}

public sealed class ParseResult
{
    public List<BscScoreDto> Scores { get; set; } = new();
    public List<AccessCredentialPreviewDto> AccessCredentials { get; set; } = new();
}

public sealed class BscScoreDto
{
    public string DealerCode { get; set; } = "";
    public string DealerName { get; set; } = "";
    public string Zone { get; set; } = "";
    public string Region { get; set; } = "";
    public string FiscalYear { get; set; } = "FY 26-27";
    public string Month { get; set; } = "Apr'26";
    public string ProvisionalType { get; set; } = "provisional";
    public ScoreSummary EarlyBird { get; set; } = new();
    public ScoreSummary FullYear { get; set; } = new();
    public List<BusinessAreaDto> BusinessAreas { get; set; } = new();
}

public sealed class ScoreSummary
{
    public string ProvisionalScore { get; set; } = "";
    public string ProvisionalScorePercent { get; set; } = "";
    public string Qualification { get; set; } = "N";
    public string Band { get; set; } = "NO BAND";
    public MetricDto? Total { get; set; }
}

public sealed class BusinessAreaDto
{
    public string AreaName { get; set; } = "";
    public object EarlyBirdTotal { get; set; } = 0m;
    public object FullYearTotal { get; set; } = 0m;
    public List<ParameterDto> Parameters { get; set; } = new();
}

public sealed class ParameterDto
{
    public int SNo { get; set; }
    public string Parameter { get; set; } = "";
    public string AccessConditionMet { get; set; } = "";
    public MetricDto EarlyBird { get; set; } = new();
    public MetricDto FullYear { get; set; } = new();
    public bool ExcludeFromTotals { get; set; }
}

public sealed class MetricDto
{
    public decimal MaxPoints { get; set; }
    public decimal MinPoints { get; set; }
    public decimal Achieved { get; set; }
}

public sealed class AccessCredentialPreviewDto
{
    public string Id { get; set; } = "";
    public string DealerCode { get; set; } = "";
    public string DealerName { get; set; } = "";
    public string MailId { get; set; } = "";
    public string Password { get; set; } = "1234";
    public string Zone { get; set; } = "";
    public string Region { get; set; } = "";
    public List<string> MsilPersons { get; set; } = new() { "ayush" };
}

public static class BscExcelParser
{
    private static readonly string[] EarlyBirdSheetNames =
    {
        "Early Bird", "EarlyBird", "Early Bird Points", "Early Year", "Early Year Points"
    };

    private static readonly string[] FullYearSheetNames =
    {
        "Full Year", "FullYear", "Full Year Points"
    };

    private static readonly string[] AreaNames =
    {
        "Sales Performance",
        "Sales Quality Performance",
        "Service Performance",
        "Service Quality",
        "Parts & Accessories Performance",
        "True Value",
        "Dealer Financials",
        "Dealer Infrastructure"
    };

    private static readonly WidePeriodConfig EarlyBirdWideConfig = new()
    {
        Achieved = ("E", "AI"),
        AchievedTotals = ("AP", "AW"),
        AchievedGrandColumn = "AX",
        MaxPoints = ("AZ", "CD"),
        MaxTotals = ("CG", "CN"),
        MaxGrandColumn = "CO",
        MinPoints = ("CQ", "DU"),
        MinTotals = ("DX", "EE"),
        MinGrandColumn = "EF",
        ScoreColumn = "AK",
        DenominatorValue = 1000,
        QualificationColumn = "AM",
        BandColumn = "AN"
    };

    private static readonly WidePeriodConfig FullYearWideConfig = new()
    {
        Achieved = ("E", "AI"),
        AchievedTotals = ("BJ", "BR"),
        AchievedGrandColumn = "BR",
        MaxPoints = ("BT", "CX"),
        MaxTotals = ("DA", "DI"),
        MaxGrandColumn = "DI",
        MinPoints = ("DK", "EO"),
        MinTotals = ("ER", "EZ"),
        MinGrandColumn = "EZ",
        ScoreColumn = "AK",
        ScorePercentColumn = "AL",
        BandColumn = "AM",
        DenominatorColumn = "DI"
    };

    public static ParseResult ParseWorkbookWithMetadata(Stream excelStream, ParseOptions options)
    {
        using var workbook = new XLWorkbook(excelStream);
        var earlyBirdData = GetWorksheetData(workbook, EarlyBirdSheetNames);
        var fullYearData = GetWorksheetData(workbook, FullYearSheetNames);

        if (IsWideTemplateRows(earlyBirdData.Rows) || IsWideTemplateRows(fullYearData.Rows))
        {
            return MergeWideTemplateRows(earlyBirdData, fullYearData, options);
        }

        var scores = MergeSimpleRows(
            GetObjectRows(workbook, EarlyBirdSheetNames),
            GetObjectRows(workbook, FullYearSheetNames),
            options);

        return new ParseResult { Scores = scores, AccessCredentials = new List<AccessCredentialPreviewDto>() };
    }

    private static ParseResult MergeWideTemplateRows(WorksheetData earlyBirdData, WorksheetData fullYearData, ParseOptions options)
    {
        var scoreMap = new Dictionary<string, BscScoreDto>(StringComparer.OrdinalIgnoreCase);
        var fullHeaderIndex = FindWideTemplateHeaderIndex(fullYearData.Rows);
        var earlyHeaderIndex = FindWideTemplateHeaderIndex(earlyBirdData.Rows);
        var fullHeaderRow = fullHeaderIndex >= 0 ? fullYearData.Rows[fullHeaderIndex] : new List<string>();
        var earlyHeaderRow = earlyHeaderIndex >= 0 ? earlyBirdData.Rows[earlyHeaderIndex] : new List<string>();

        foreach (var item in GetWideTemplateDataRows(fullYearData.Rows).Select((row, index) => new { row, index }))
        {
            var dealerCode = GetCellAt(item.row, "C").Trim();
            if (string.IsNullOrWhiteSpace(dealerCode)) continue;

            var score = CreateWideTemplateScore(item.row, options);
            var displayRowIndex = item.index + fullHeaderIndex + 1;
            ApplyWideTemplatePeriod(score, item.row, "fullYear",
                GetRowOrDefault(fullYearData.DisplayRows, displayRowIndex, item.row), fullHeaderRow);
            scoreMap[dealerCode] = score;
        }

        foreach (var item in GetWideTemplateDataRows(earlyBirdData.Rows).Select((row, index) => new { row, index }))
        {
            var dealerCode = GetCellAt(item.row, "C").Trim();
            if (string.IsNullOrWhiteSpace(dealerCode)) continue;

            if (!scoreMap.TryGetValue(dealerCode, out var score))
            {
                score = CreateWideTemplateScore(item.row, options);
            }

            if (string.IsNullOrWhiteSpace(score.DealerName)) score.DealerName = GetCellAt(item.row, "D").Trim();
            if (string.IsNullOrWhiteSpace(score.Region)) score.Region = GetCellAt(item.row, "B").Trim();
            if (string.IsNullOrWhiteSpace(score.Zone)) score.Zone = GetCellAt(item.row, "A").Trim();

            var displayRowIndex = item.index + earlyHeaderIndex + 1;
            ApplyWideTemplatePeriod(score, item.row, "earlyBird",
                GetRowOrDefault(earlyBirdData.DisplayRows, displayRowIndex, item.row), earlyHeaderRow);
            scoreMap[dealerCode] = score;
        }

        var scores = scoreMap.Values.ToList();
        var credentials = scores.Select((score, index) => new AccessCredentialPreviewDto
        {
            Id = $"excel-dealer-{index + 1}",
            DealerCode = score.DealerCode,
            DealerName = string.IsNullOrWhiteSpace(score.DealerName) ? score.DealerCode : score.DealerName,
            MailId = $"dealer_{index + 1}@gmail.com",
            Password = "1234",
            Zone = score.Zone,
            Region = score.Region,
            MsilPersons = new List<string> { "ayush" }
        }).ToList();

        return new ParseResult { Scores = scores, AccessCredentials = credentials };
    }

    private static List<BscScoreDto> MergeSimpleRows(
        List<Dictionary<string, string>> earlyBirdRows,
        List<Dictionary<string, string>> fullYearRows,
        ParseOptions options)
    {
        var scoreMap = new Dictionary<string, BscScoreDto>(StringComparer.OrdinalIgnoreCase);

        foreach (var row in fullYearRows)
        {
            var dealerCode = GetDealerCode(row);
            if (string.IsNullOrWhiteSpace(dealerCode)) continue;

            var score = CreateBaseScore(dealerCode, GetDealerName(row), GetRegion(row), "", options);
            ApplyParameterValues(score, row, "fullYear");
            ApplyFullYearTotals(score);
            scoreMap[dealerCode] = score;
        }

        foreach (var row in earlyBirdRows)
        {
            var dealerCode = GetDealerCode(row);
            if (string.IsNullOrWhiteSpace(dealerCode)) continue;

            if (!scoreMap.TryGetValue(dealerCode, out var score))
            {
                score = CreateBaseScore(dealerCode, GetDealerName(row), GetRegion(row), "", options);
            }

            if (string.IsNullOrWhiteSpace(score.DealerName)) score.DealerName = GetDealerName(row);
            if (string.IsNullOrWhiteSpace(score.Region)) score.Region = GetRegion(row);

            ApplyParameterValues(score, row, "earlyBird");
            ApplyEarlyBirdTotals(score, row);
            scoreMap[dealerCode] = score;
        }

        return scoreMap.Values.ToList();
    }

    private static BscScoreDto CreateWideTemplateScore(List<string> row, ParseOptions options)
    {
        var score = CreateBaseScore(
            GetCellAt(row, "C").Trim(),
            GetCellAt(row, "D").Trim(),
            GetCellAt(row, "B").Trim(),
            GetCellAt(row, "A").Trim(),
            options);
        return score;
    }

    private static BscScoreDto CreateBaseScore(string dealerCode, string dealerName, string region, string zone, ParseOptions options)
    {
        return new BscScoreDto
        {
            DealerCode = dealerCode,
            DealerName = dealerName,
            Region = region,
            Zone = zone,
            FiscalYear = string.IsNullOrWhiteSpace(options.FiscalYear) ? "FY 26-27" : options.FiscalYear!,
            Month = string.IsNullOrWhiteSpace(options.Month) ? "Apr'26" : options.Month!,
            ProvisionalType = "provisional",
            EarlyBird = new ScoreSummary { Qualification = "N", Band = "NO BAND" },
            FullYear = new ScoreSummary { Qualification = "N", Band = "NO BAND" },
            BusinessAreas = new List<BusinessAreaDto>
            {
                Area("Sales Performance", new()
                {
                    Param(1, "All Models Wholesales Performance", Metric(40, 0), Metric(40, 0)),
                    Param(2, "ARENA SUV Models Wholesales Performance", Metric(60, 0), Metric(60, 0)),
                    Param(3, "ARENA Models New Car VAHAN Registration", Metric(100, 0), Metric(100, 0)),
                    Param(4, "Maruti Suzuki Smart Finance", Metric(20, 0), Metric(20, 0)),
                    Param(5, "Maruti Suzuki Rewards Enrolment", Metric(10, 0), Metric(10, 0)),
                }),
                Area("Sales Quality Performance", new()
                {
                    Param(6, "Net Promoter Score - ARENA", Metric(40, 0), Metric(40, 0)),
                    Param(7, "ARENA Channel Sales Manpower Certification", Metric(0, 0), Metric(0, 0)),
                }),
                Area("Service Performance", new()
                {
                    Param(8, "Service to Sales Ratio", Metric(60, -30), Metric(60, -30)),
                    Param(9, "Extended Warranty Penetration", Metric(60, -20), Metric(60, -20)),
                    Param(10, "Customer Convenience Package Penetration", Metric(35, -20), Metric(35, -20)),
                    Param(11, "True Value Vehicle Retention", Metric(0, 0), Metric(0, 0)),
                }),
                Area("Service Quality", new()
                {
                    Param(12, "Net Promoter Score - Service & Bodyshop", Metric(40, -20), Metric(40, -20)),
                    Param(13, "Customer Complaint Index - Service", Metric(30, -10), Metric(30, -10)),
                    Param(14, "Service Manpower Certification", Metric(30, 0), Metric(30, 0)),
                    Param(15, "Service Infrastructure", Metric(0, 0), Metric(0, 0)),
                }),
                Area("Parts & Accessories Performance", new()
                {
                    Param(16, "MSGP Performance", Metric(65, -15), Metric(65, -15)),
                    Param(17, "MSGA Performance- Showroom Acc / Veh", Metric(75, -10), Metric(75, -10)),
                    Param(18, "MSGA Performance - Online Order Conversion", Metric(10, 0), Metric(10, 0)),
                    Param(19, "MSGA Performance - Body Coat Penetration", Metric(0, 0), Metric(0, 0)),
                }),
                Area("True Value", new()
                {
                    Param(20, "Exch. Growth", Metric(60, 0), Metric(60, 0)),
                    Param(21, "Purchase Cycle Management", Metric(40, 0), Metric(40, 0)),
                    Param(22, "Net Promoter Score - True Value", Metric(10, 0), Metric(10, 0)),
                    Param(23, "POC Manpower Certification", Metric(0, 0), Metric(0, 0)),
                    Param(24, "End of Life Vehicle Scrap Penetration - ARENA (Bonus Parameter)", Metric(0, 0), Metric(40, 0), true),
                }),
                Area("Dealer Financials", new()
                {
                    Param(25, "Dealer Financial Ratio", Metric(0, 0), Metric(0, 0)),
                    Param(26, "Working Capital Diversion & Inadequacy", Metric(0, 0), Metric(0, 0)),
                }),
                Area("Dealer Infrastructure", new()
                {
                    Param(27, "ARENA & TV Infrastructure - Upgradation", Metric(0, 0), Metric(0, 0)),
                    Param(28, "ARENA & TV Infrastructure - Quarterly Maintenance", Metric(0, 0), Metric(0, 0)),
                    Param(29, "Charging Infrastructure (Bonus Parameter)", Metric(0, 0), Metric(30, 0), true),
                    Param(30, "Maruti Suzuki Driving School", Metric(0, -10), Metric(0, -10)),
                    Param(31, "Adequate Insurance Coverage & Preventive Safety Audit", Metric(0, 0), Metric(0, 0)),
                })
            }
        };
    }

    private static BusinessAreaDto Area(string name, List<ParameterDto> parameters) =>
        new() { AreaName = name, Parameters = parameters };

    private static MetricDto Metric(decimal maxPoints, decimal minPoints, decimal achieved = 0) =>
        new() { MaxPoints = maxPoints, MinPoints = minPoints, Achieved = achieved };

    private static ParameterDto Param(int sNo, string text, MetricDto earlyBird, MetricDto fullYear, bool excludeFromTotals = false) =>
        new()
        {
            SNo = sNo,
            Parameter = text,
            AccessConditionMet = "",
            EarlyBird = earlyBird,
            FullYear = fullYear,
            ExcludeFromTotals = excludeFromTotals
        };

    private static void ApplyWideTemplatePeriod(BscScoreDto score, List<string> row, string period, List<string> displayRow, List<string> headerRow)
    {
        var config = period == "fullYear" ? FullYearWideConfig : EarlyBirdWideConfig;

        ApplyMetricRange(score, row, period, "achieved", config.Achieved.Start, config.Achieved.End);

        var maxRange = ResolveParameterRange(score, headerRow, config.MaxPoints, Col(config.MaxPoints.Start));
        ApplyMetricRange(score, row, period, "maxPoints", maxRange.Start, maxRange.End);

        var minRange = ResolveParameterRange(score, headerRow, config.MinPoints, Col(maxRange.End) + 1);
        ApplyMetricRange(score, row, period, "minPoints", minRange.Start, minRange.End);

        var achievedGrand = HasAreaTotalHeaderRange(headerRow, config.AchievedTotals)
            ? ApplyAreaTotalRange(score, row, period, "achieved", config.AchievedTotals.Start, config.AchievedTotals.End)
            : CalculateGrandMetricTotal(score, period, "achieved");
        var achievedGrandTotal = ToNumber(GetCellAt(row, config.AchievedGrandColumn)) != 0
            ? ToNumber(GetCellAt(row, config.AchievedGrandColumn))
            : achievedGrand;

        var maxGrand = HasAreaTotalHeaderRange(headerRow, config.MaxTotals)
            ? ApplyAreaTotalRange(score, row, period, "maxPoints", config.MaxTotals.Start, config.MaxTotals.End)
            : CalculateGrandMetricTotal(score, period, "maxPoints");
        var maxGrandTotal = ToNumber(GetCellAt(row, config.MaxGrandColumn)) != 0
            ? ToNumber(GetCellAt(row, config.MaxGrandColumn))
            : maxGrand;

        decimal minGrand;
        if (HasAreaTotalHeaderRange(headerRow, config.MinTotals))
        {
            minGrand = ApplyAreaTotalRange(score, row, period, "minPoints", config.MinTotals.Start, config.MinTotals.End);
        }
        else
        {
            EnsureCalculatedAreaTotals(score, period);
            minGrand = CalculateGrandMetricTotal(score, period, "minPoints");
        }
        var minGrandTotal = ToNumber(GetCellAt(row, config.MinGrandColumn)) != 0
            ? ToNumber(GetCellAt(row, config.MinGrandColumn))
            : minGrand;

        if (period == "fullYear")
        {
            var scoreValue = ReadDisplayCellByHeader(row, displayRow, headerRow,
                new[] { "Full Year Provisional Score (Out of 1000)", "Full Year Provisional Score" },
                config.ScoreColumn);
            if (string.IsNullOrWhiteSpace(scoreValue)) scoreValue = achievedGrandTotal.ToString(CultureInfo.InvariantCulture);

            var denominator = FirstNonZero(
                ToNumber(GetCellAt(row, config.DenominatorColumn)),
                ToNumber(GetCellAt(row, ColumnName(Col(maxRange.End) + 1))),
                maxGrandTotal);

            score.FullYear.ProvisionalScore = $"{scoreValue.Trim()}/{denominator}";
            score.FullYear.ProvisionalScorePercent = ReadDisplayCellByHeader(row, displayRow, headerRow,
                new[] { "Full Year Provisional Score Achievement" }, config.ScorePercentColumn).Trim();
            score.FullYear.Qualification = string.IsNullOrWhiteSpace(score.FullYear.Qualification) ? "N" : score.FullYear.Qualification;
            score.FullYear.Total = Metric(maxGrandTotal, minGrandTotal, achievedGrandTotal);
            score.FullYear.Band = DefaultIfBlank(
                ReadDisplayCellByHeader(row, displayRow, headerRow, new[] { "Full Year Band" }, config.BandColumn),
                "NO BAND");
        }
        else
        {
            var scoreValue = GetDisplayCellAt(row, displayRow, config.ScoreColumn);
            if (string.IsNullOrWhiteSpace(scoreValue)) scoreValue = achievedGrandTotal.ToString(CultureInfo.InvariantCulture);

            var denominator = FirstNonZero(
                config.DenominatorValue,
                ToNumber(GetCellAt(row, config.DenominatorColumn)),
                ToNumber(GetCellAt(row, ColumnName(Col(maxRange.End) + 1))),
                maxGrandTotal);

            score.EarlyBird.ProvisionalScore = $"{scoreValue.Trim()}/{denominator}";
            score.EarlyBird.ProvisionalScorePercent = "";
            score.EarlyBird.Total = Metric(maxGrandTotal, minGrandTotal, achievedGrandTotal);
            score.EarlyBird.Qualification = DefaultIfBlank(
                ReadDisplayCellByHeader(row, displayRow, headerRow,
                    new[] { "Early Year Band Qualification", "Early Bird Qualification" },
                    config.QualificationColumn),
                "N");
            score.EarlyBird.Band = DefaultIfBlank(
                ReadDisplayCellByHeader(row, displayRow, headerRow,
                    new[] { "Early Year Band", "Early Bird Band" },
                    config.BandColumn),
                "NO BAND");
        }
    }

    private static void ApplyMetricRange(BscScoreDto score, List<string> row, string period, string key, string startColumn, string endColumn)
    {
        var values = GetRangeValues(row, startColumn, endColumn);
        var parameters = GetFlatParameters(score);

        for (var index = 0; index < parameters.Count; index++)
        {
            SetMetricValue(GetMetric(parameters[index], period), key, ToNumber(index < values.Count ? values[index] : ""));
        }
    }

    private static decimal ApplyAreaTotalRange(BscScoreDto score, List<string> row, string period, string key, string startColumn, string endColumn)
    {
        var values = GetRangeValues(row, startColumn, endColumn);
        for (var index = 0; index < score.BusinessAreas.Count; index++)
        {
            var total = GetAreaMetricTotal(score.BusinessAreas[index], period);
            SetMetricValue(total, key, ToNumber(index < values.Count ? values[index] : ""));
            SetAreaMetricTotal(score.BusinessAreas[index], period, total);
        }

        return ToNumber(values.Count > AreaNames.Length ? values[AreaNames.Length] : "");
    }

    private static void ApplyParameterValues(BscScoreDto score, Dictionary<string, string> row, string period)
    {
        foreach (var mapping in ParameterMappings)
        {
            var value = GetCell(row, mapping.Columns);
            if (string.IsNullOrWhiteSpace(value)) continue;

            var area = score.BusinessAreas.FirstOrDefault(x => Normalize(x.AreaName) == Normalize(mapping.Area));
            var param = area?.Parameters.FirstOrDefault(x => Normalize(x.Parameter) == Normalize(mapping.Parameter));
            if (param == null) continue;

            GetMetric(param, period).Achieved = ToNumber(value);
        }
    }

    private static void ApplyFullYearTotals(BscScoreDto score)
    {
        foreach (var area in score.BusinessAreas)
        {
            area.FullYearTotal = CalculateAreaTotal(area, "fullYear");
        }

        var grandTotal = score.BusinessAreas.Sum(area => ToNumber(area.FullYearTotal));
        var maxTotal = CalculateGrandMetricTotal(score, "fullYear", "maxPoints");

        score.FullYear.ProvisionalScore = $"{grandTotal}/{maxTotal}";
        score.FullYear.ProvisionalScorePercent = maxTotal != 0 ? $"{Math.Round((grandTotal / maxTotal) * 100)}%" : "0%";
        score.FullYear.Qualification = "N";
        score.FullYear.Band = "NO BAND";
    }

    private static void ApplyEarlyBirdTotals(BscScoreDto score, Dictionary<string, string> row)
    {
        foreach (var mapping in EarlyBirdTotalMappings)
        {
            var area = score.BusinessAreas.FirstOrDefault(x => Normalize(x.AreaName) == Normalize(mapping.Area));
            if (area == null) continue;

            var value = GetCell(row, mapping.Columns);
            if (!string.IsNullOrWhiteSpace(value)) area.EarlyBirdTotal = ToNumber(value);
        }

        foreach (var area in score.BusinessAreas)
        {
            area.EarlyBirdTotal = CalculateAreaTotal(area, "earlyBird");
        }

        var grandTotal = score.BusinessAreas.Sum(area => ToNumber(area.EarlyBirdTotal));
        var maxTotal = CalculateGrandMetricTotal(score, "earlyBird", "maxPoints");

        score.EarlyBird.ProvisionalScore = $"{grandTotal}/{maxTotal}";
        score.EarlyBird.ProvisionalScorePercent = GetCell(row, new[]
        {
            "Full Year Provisional Score Achievement",
            "Early Bird Provisional Score Achievement",
            "Early Bird Score Achievement"
        });
        score.EarlyBird.Qualification = DefaultIfBlank(GetCell(row, new[] { "Early Year Band Qualification", "Early Bird Qualification" }), "N");
        score.EarlyBird.Band = DefaultIfBlank(GetCell(row, new[] { "Early Year Band", "Early Bird Band" }), "NO BAND");
    }

    private static readonly List<ParameterMapping> ParameterMappings = new()
    {
        new("Sales Performance", "All Models Wholesales Performance", "All Models Wholesales Performance", "All Models Wholesale Performance", "All Models Wholsales Performance"),
        new("Sales Performance", "ARENA SUV Models Wholesales Performance", "ARENA SUV Models Wholesales Performance", "ARENA SUV Models Wholesale Performance", "SUV Models Wholesales Performance"),
        new("Sales Performance", "ARENA Models New Car VAHAN Registration", "ARENA Models New Car VAHAN Registration", "New Car VAHAN Registration", "VAHAN Registration"),
        new("Sales Performance", "Maruti Suzuki Smart Finance", "Maruti Suzuki Smart Finance", "Smart Finance"),
        new("Sales Performance", "Maruti Suzuki Rewards Enrolment", "Maruti Suzuki Rewards Enrolment", "Maruti Suzuki Rewards Enrollment", "Rewards Enrolment"),
        new("Sales Quality Performance", "Net Promoter Score - ARENA", "NPS", "Net Promoter Score", "Net Promoter Score ARENA"),
        new("Sales Quality Performance", "ARENA Channel Sales Manpower Certification", "ARENA Channel Sales Manpower Certification"),
        new("Service Performance", "Service to Sales Ratio", "Service to Sales Ratio"),
        new("Service Performance", "Extended Warranty Penetration", "Extended Warranty Penetration"),
        new("Service Performance", "Customer Convenience Package Penetration", "Customer Convenience Package Penetration", "Customer Convenience Package"),
        new("Service Performance", "True Value Vehicle Retention", "True Value Vehicle Retention"),
        new("Service Quality", "Net Promoter Score - Service & Bodyshop", "Net Promoter Score - Workshop & Bodyshop", "Net Promoter Score - Service & Bodyshop"),
        new("Service Quality", "Customer Complaint Index - Service", "Customer Complaint Index - Service", "Customer Complaint Index (Service)", "Customer Complaint Index"),
        new("Service Quality", "Service Manpower Certification", "Service Manpower Certification", "SSQS Certified Service Manpower", "Certified Service Manpower", "Service Certified Manpower"),
        new("Service Quality", "Service Infrastructure", "Service Infrastructure"),
        new("Parts & Accessories Performance", "MSGP Performance", "MSGP Performance"),
        new("Parts & Accessories Performance", "MSGA Performance- Showroom Acc / Veh", "MSGA Performance- Showroom Acc / Veh", "MSGA Performance - Showroom Acc / Veh", "MSGA  Performance- Showroom Acc / Veh", "MSGA Performance"),
        new("Parts & Accessories Performance", "MSGA Performance - Online Order Conversion", "MSGA Performance - Online Order Conversion"),
        new("Parts & Accessories Performance", "MSGA Performance - Body Coat Penetration", "MSGA Performance - Body Coat Penetration"),
        new("True Value", "Exch. Growth", "TV Business Performance - Exchange Growth", "True Value Exch. Growth", "Exchange Growth", "Exch. Growth", "TV Exchange Growth"),
        new("True Value", "Purchase Cycle Management", "TV Business Performance - Purchase Cycle Management", "Purchase Cycle Management", "POC Sales Growth"),
        new("True Value", "Net Promoter Score - True Value", "NPS True Value", "NPS - True Value", "Net Promoter Score - True Value"),
        new("True Value", "POC Manpower Certification", "POC Manpower Certification"),
        new("True Value", "End of Life Vehicle Scrap Penetration - ARENA (Bonus Parameter)", "End of Life Vehicle Scrap Penetration - ARENA (Bonus Parameter)", "POC ELV Scrap Penetration", "ELV Penetration", "ELV Scrap Penetration", "ELV", "End of Life Vehicle Scrap Penetration (Bonus Parameter)"),
        new("Dealer Financials", "Dealer Financial Ratio", "Dealer Financial Ratio", "Dealer Financials"),
        new("Dealer Financials", "Working Capital Diversion & Inadequacy", "Working Capital Diversion & Inadequacy"),
        new("Dealer Infrastructure", "ARENA & TV Infrastructure - Upgradation", "ARENA & TV Infrastructure - Upgradation"),
        new("Dealer Infrastructure", "ARENA & TV Infrastructure - Quarterly Maintenance", "ARENA & TV Infrastructure - Quarterly Maintenance"),
        new("Dealer Infrastructure", "Charging Infrastructure (Bonus Parameter)", "Charging Infrastructure (Bonus Parameter)", "Charging Infrastructure - ARENA", "Charging Infrastructure"),
        new("Dealer Infrastructure", "Maruti Suzuki Driving School", "Maruti Suzuki Driving School", "Driving School"),
        new("Dealer Infrastructure", "Adequate Insurance Coverage & Preventive Safety Audit", "Adequate Insurance Coverage & Preventive Safety Audit")
    };

    private static readonly List<AreaTotalMapping> EarlyBirdTotalMappings = new()
    {
        new("Sales Performance", "Sales & Marketing Performance", "Sales and Marketing Performance", "Sales Performance"),
        new("Sales Quality Performance", "Sales Quality Performance"),
        new("Service Performance", "Service Performance"),
        new("Service Quality", "Service Quality Performance", "Service Quality"),
        new("Parts & Accessories Performance", "Parts & Accessories Performance", "Parts and Accessories Performance"),
        new("True Value", "True Value Performance", "True Value"),
        new("Dealer Financials", "Dealer Financials"),
        new("Dealer Infrastructure", "Dealer Infrastructure")
    };

    private static WorksheetData GetWorksheetData(XLWorkbook workbook, string[] sheetNames)
    {
        var worksheet = FindWorksheet(workbook, sheetNames);
        if (worksheet == null) return new WorksheetData();

        var range = worksheet.RangeUsed();
        if (range == null) return new WorksheetData();

        var maxRow = range.RangeAddress.LastAddress.RowNumber;
        var maxColumn = range.RangeAddress.LastAddress.ColumnNumber;
        var rows = new List<List<string>>();
        var displayRows = new List<List<string>>();

        for (var rowIndex = 1; rowIndex <= maxRow; rowIndex++)
        {
            var row = new List<string>();
            var displayRow = new List<string>();
            for (var columnIndex = 1; columnIndex <= maxColumn; columnIndex++)
            {
                var cell = worksheet.Cell(rowIndex, columnIndex);
                row.Add(cell.Value.ToString(CultureInfo.InvariantCulture) ?? "");
                displayRow.Add(cell.GetFormattedString());
            }
            rows.Add(row);
            displayRows.Add(displayRow);
        }

        return new WorksheetData { Rows = rows, DisplayRows = displayRows };
    }

    private static List<Dictionary<string, string>> GetObjectRows(XLWorkbook workbook, string[] sheetNames)
    {
        var data = GetWorksheetData(workbook, sheetNames);
        if (!data.Rows.Any()) return new List<Dictionary<string, string>>();

        var headerIndex = FindWideTemplateHeaderIndex(data.Rows);
        if (headerIndex >= 0)
        {
            var templateColumnCount = Col("AI") + 1;
            var headers = data.Rows[headerIndex].Take(templateColumnCount).ToList();
            return data.Rows.Skip(headerIndex + 1).Select(row =>
            {
                var record = new Dictionary<string, string>();
                for (var index = 0; index < headers.Count; index++)
                {
                    if (!string.IsNullOrWhiteSpace(headers[index]))
                    {
                        record[headers[index]] = index < row.Count ? row[index] : "";
                    }
                }
                return record;
            }).ToList();
        }

        var normalHeaders = data.Rows.FirstOrDefault() ?? new List<string>();
        return data.Rows.Skip(1).Select(row =>
        {
            var record = new Dictionary<string, string>();
            for (var index = 0; index < normalHeaders.Count; index++)
            {
                if (!string.IsNullOrWhiteSpace(normalHeaders[index]))
                {
                    record[normalHeaders[index]] = index < row.Count ? row[index] : "";
                }
            }
            return record;
        }).ToList();
    }

    private static IXLWorksheet? FindWorksheet(XLWorkbook workbook, string[] sheetNames)
    {
        var expected = sheetNames.Select(Normalize).ToList();
        var sheets = workbook.Worksheets.Select(ws => new { Worksheet = ws, Name = ws.Name, Normalized = Normalize(ws.Name) }).ToList();
        return sheets.FirstOrDefault(sheet => expected.Contains(sheet.Normalized))?.Worksheet
            ?? sheets.FirstOrDefault(sheet => expected.Any(e => sheet.Normalized.Contains(e) || e.Contains(sheet.Normalized)))?.Worksheet;
    }

    private static bool IsWideTemplateRows(List<List<string>> rows) => FindWideTemplateHeaderIndex(rows) >= 0;

    private static int FindWideTemplateHeaderIndex(List<List<string>> rows)
    {
        for (var index = 0; index < rows.Count; index++)
        {
            if (Normalize(GetCellAt(rows[index], "C")) == Normalize("BSC Parent Dealer Code") &&
                Normalize(GetCellAt(rows[index], "E")) == Normalize("All Models Wholesales Performance"))
            {
                return index;
            }
        }
        return -1;
    }

    private static IEnumerable<List<string>> GetWideTemplateDataRows(List<List<string>> rows)
    {
        var headerIndex = FindWideTemplateHeaderIndex(rows);
        return headerIndex >= 0 ? rows.Skip(headerIndex + 1) : Enumerable.Empty<List<string>>();
    }

    private static (string Start, string End) ResolveParameterRange(BscScoreDto score, List<string> headerRow, (string Start, string End) preferredRange, int fallbackStartColumn)
    {
        var expectedHeaders = GetFlatParameters(score).Select(p => ParameterHeaderAliases(p.Parameter)).ToList();
        var preferredStart = Col(preferredRange.Start);

        if (ScoreParameterHeaderBlock(headerRow, preferredStart, expectedHeaders) >= 28) return preferredRange;

        for (var start = fallbackStartColumn; start <= headerRow.Count - 31; start++)
        {
            if (ScoreParameterHeaderBlock(headerRow, start, expectedHeaders) >= 28)
            {
                return (ColumnName(start), ColumnName(start + 30));
            }
        }

        return preferredRange;
    }

    private static int ScoreParameterHeaderBlock(List<string> headerRow, int startColumnIndex, List<List<string>> expectedHeaders)
    {
        if (startColumnIndex < 0) return 0;
        var matches = 0;
        for (var index = 0; index < expectedHeaders.Count; index++)
        {
            var header = Normalize(GetAt(headerRow, startColumnIndex + index));
            if (expectedHeaders[index].Contains(header)) matches++;
        }
        return matches;
    }

    private static List<string> ParameterHeaderAliases(string parameterName)
    {
        var normalized = Normalize(parameterName);
        if (normalized == Normalize("Purchase Cycle Management"))
        {
            return new List<string> { normalized, Normalize("Repurchase Cycle Management") };
        }
        if (normalized == Normalize("MSGA Performance- Showroom Acc / Veh"))
        {
            return new List<string>
            {
                normalized,
                Normalize("MSGA Performance - Showroom Acc / Veh"),
                Normalize("MSGA  Performance- Showroom Acc / Veh")
            };
        }
        return new List<string> { normalized };
    }

    private static bool HasAreaTotalHeaderRange(List<string> headerRow, (string Start, string End) range)
    {
        var labels = AreaNames.Select(Normalize).ToList();
        var rangeLabels = GetRangeValues(headerRow, range.Start, range.End).Select(Normalize).ToList();
        if (rangeLabels.Count < 8) return false;

        var areaMatches = labels.Select((label, index) =>
        {
            var header = rangeLabels[index];
            return header == label || header.Contains(label) || label.Contains(header);
        }).Count(match => match);

        var grandHeader = rangeLabels.Count > 8 ? rangeLabels[8] : "";
        return areaMatches >= 6 && (string.IsNullOrWhiteSpace(grandHeader) || grandHeader == "total");
    }

    private static void EnsureCalculatedAreaTotals(BscScoreDto score, string period)
    {
        foreach (var area in score.BusinessAreas)
        {
            SetAreaMetricTotal(area, period, new MetricDto
            {
                Achieved = CalculateAreaMetricTotal(area, period, "achieved"),
                MaxPoints = CalculateAreaMetricTotal(area, period, "maxPoints"),
                MinPoints = CalculateAreaMetricTotal(area, period, "minPoints")
            });
        }
    }

    private static decimal CalculateAreaTotal(BusinessAreaDto area, string period) =>
        area.Parameters.Where(p => !p.ExcludeFromTotals).Sum(p => GetMetric(p, period).Achieved);

    private static decimal CalculateAreaMetricTotal(BusinessAreaDto area, string period, string key) =>
        area.Parameters.Where(p => !p.ExcludeFromTotals).Sum(p => GetMetricValue(GetMetric(p, period), key));

    private static decimal CalculateGrandMetricTotal(BscScoreDto score, string period, string key) =>
        score.BusinessAreas.Sum(area => CalculateAreaMetricTotal(area, period, key));

    private static List<ParameterDto> GetFlatParameters(BscScoreDto score) =>
        score.BusinessAreas.SelectMany(area => area.Parameters).ToList();

    private static MetricDto GetMetric(ParameterDto parameter, string period) =>
        period == "fullYear" ? parameter.FullYear : parameter.EarlyBird;

    private static MetricDto GetAreaMetricTotal(BusinessAreaDto area, string period)
    {
        var value = period == "fullYear" ? area.FullYearTotal : area.EarlyBirdTotal;
        return value is MetricDto metric ? metric : Metric(0, 0, ToNumber(value));
    }

    private static void SetAreaMetricTotal(BusinessAreaDto area, string period, MetricDto metric)
    {
        if (period == "fullYear") area.FullYearTotal = metric;
        else area.EarlyBirdTotal = metric;
    }

    private static decimal GetMetricValue(MetricDto metric, string key) =>
        key switch
        {
            "maxPoints" => metric.MaxPoints,
            "minPoints" => metric.MinPoints,
            _ => metric.Achieved
        };

    private static void SetMetricValue(MetricDto metric, string key, decimal value)
    {
        if (key == "maxPoints") metric.MaxPoints = value;
        else if (key == "minPoints") metric.MinPoints = value;
        else metric.Achieved = value;
    }

    private static string GetCell(Dictionary<string, string> row, IEnumerable<string> possibleNames)
    {
        var keys = row.Keys.ToList();
        var exactKey = keys.FirstOrDefault(key => possibleNames.Any(name => Normalize(key) == Normalize(name)));
        if (exactKey != null) return row[exactKey];

        var partialKey = keys.FirstOrDefault(key =>
        {
            var normalizedKey = Normalize(key);
            return possibleNames.Any(name =>
            {
                var normalizedName = Normalize(name);
                return normalizedKey.Contains(normalizedName) || normalizedName.Contains(normalizedKey);
            });
        });

        return partialKey != null ? row[partialKey] : "";
    }

    private static string GetDealerCode(Dictionary<string, string> row) =>
        GetCell(row, new[] { "BSC Parent Dealer Code", "Parent Dealer Code", "Dealer Code", "Code" }).Trim();

    private static string GetDealerName(Dictionary<string, string> row) =>
        GetCell(row, new[] { "Dealer Name", "Dealer" }).Trim();

    private static string GetRegion(Dictionary<string, string> row) =>
        GetCell(row, new[] { "Region" }).Trim();

    private static string GetDisplayCellAt(List<string> row, List<string> displayRow, string columnName)
    {
        var displayValue = GetCellAt(displayRow, columnName);
        return string.IsNullOrWhiteSpace(displayValue) ? GetCellAt(row, columnName) : displayValue;
    }

    private static string ReadDisplayCellByHeader(List<string> row, List<string> displayRow, List<string> headerRow, string[] possibleNames, string fallbackColumn)
    {
        var headerColumnIndex = FindHeaderColumn(headerRow, possibleNames);
        var column = headerColumnIndex >= 0 ? ColumnName(headerColumnIndex) : fallbackColumn;
        return GetDisplayCellAt(row, displayRow, column);
    }

    private static int FindHeaderColumn(List<string> headerRow, IEnumerable<string> possibleNames)
    {
        var normalizedNames = possibleNames.Select(Normalize).ToList();
        return headerRow.FindIndex(value => normalizedNames.Contains(Normalize(value)));
    }

    private static List<string> GetRangeValues(List<string> row, string startColumn, string endColumn)
    {
        var start = Col(startColumn);
        var end = Col(endColumn);
        var values = new List<string>();
        for (var index = start; index <= end; index++) values.Add(GetAt(row, index));
        return values;
    }

    private static string GetCellAt(List<string> row, string columnName) => GetAt(row, Col(columnName));

    private static string GetAt(List<string> row, int index) => index >= 0 && index < row.Count ? row[index] ?? "" : "";

    private static List<string> GetRowOrDefault(List<List<string>> rows, int index, List<string> fallback) =>
        index >= 0 && index < rows.Count ? rows[index] : fallback;

    private static decimal ToNumber(object? value)
    {
        if (value == null) return 0;
        var cleaned = Convert.ToString(value, CultureInfo.InvariantCulture)?.Replace("%", "").Trim();
        return decimal.TryParse(cleaned, NumberStyles.Any, CultureInfo.InvariantCulture, out var number) ? number : 0;
    }

    private static string Normalize(string? value)
    {
        var text = (value ?? "").ToLowerInvariant().Replace("&", "and");
        text = Regex.Replace(text, "[^a-z0-9]+", " ");
        return text.Trim();
    }

    private static string DefaultIfBlank(string value, string fallback) =>
        string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();

    private static decimal FirstNonZero(params decimal[] values) => values.FirstOrDefault(value => value != 0);

    private static int Col(string columnName)
    {
        var result = 0;
        foreach (var character in columnName.ToUpperInvariant())
        {
            result *= 26;
            result += character - 'A' + 1;
        }
        return result - 1;
    }

    private static string ColumnName(int index)
    {
        var dividend = index + 1;
        var columnName = "";
        while (dividend > 0)
        {
            var modulo = (dividend - 1) % 26;
            columnName = Convert.ToChar('A' + modulo) + columnName;
            dividend = (dividend - modulo) / 26;
        }
        return columnName;
    }

    private sealed record ParameterMapping(string Area, string Parameter, params string[] Columns);
    private sealed record AreaTotalMapping(string Area, params string[] Columns);

    private sealed class WorksheetData
    {
        public List<List<string>> Rows { get; set; } = new();
        public List<List<string>> DisplayRows { get; set; } = new();
    }

    private sealed class WidePeriodConfig
    {
        public (string Start, string End) Achieved { get; set; }
        public (string Start, string End) AchievedTotals { get; set; }
        public string AchievedGrandColumn { get; set; } = "";
        public (string Start, string End) MaxPoints { get; set; }
        public (string Start, string End) MaxTotals { get; set; }
        public string MaxGrandColumn { get; set; } = "";
        public (string Start, string End) MinPoints { get; set; }
        public (string Start, string End) MinTotals { get; set; }
        public string MinGrandColumn { get; set; } = "";
        public string ScoreColumn { get; set; } = "";
        public string ScorePercentColumn { get; set; } = "";
        public string QualificationColumn { get; set; } = "";
        public string BandColumn { get; set; } = "";
        public string DenominatorColumn { get; set; } = "";
        public decimal DenominatorValue { get; set; }
    }
}

public sealed class DataverseBscScoreSaver
{
    private readonly ServiceClient _client;

    public DataverseBscScoreSaver(ServiceClient client)
    {
        _client = client;
    }

    public async Task SaveAsync(IEnumerable<BscScoreDto> scores, ILogger log)
    {
        foreach (var score in scores)
        {
            var zoneId = await UpsertByNameAsync(DataverseTableNames.Zone, DataverseColumns.ZoneName, score.Zone);
            var regionId = await UpsertRegionAsync(score.Region, zoneId);
            var dealerId = await UpsertDealerAsync(score, zoneId, regionId);
            var bscScoreId = await UpsertBscScoreAsync(score, dealerId, zoneId, regionId);

            for (var areaIndex = 0; areaIndex < score.BusinessAreas.Count; areaIndex++)
            {
                var businessArea = score.BusinessAreas[areaIndex];
                var businessAreaId = await UpsertBusinessAreaAsync(bscScoreId, businessArea, areaIndex + 1);

                foreach (var parameter in businessArea.Parameters)
                {
                    await UpsertParameterAsync(bscScoreId, businessAreaId, parameter);
                }
            }
        }
    }

    private async Task<Guid?> UpsertByNameAsync(string tableName, string nameColumn, string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;

        var existing = await FindOneAsync(tableName, new ConditionExpression(nameColumn, ConditionOperator.Equal, value.Trim()));
        if (existing != null) return existing.Id;

        var entity = new Entity(tableName) { [nameColumn] = value.Trim() };
        return await Task.FromResult(_client.Create(entity));
    }

    private async Task<Guid?> UpsertRegionAsync(string regionName, Guid? zoneId)
    {
        if (string.IsNullOrWhiteSpace(regionName)) return null;

        var existing = await FindOneAsync(DataverseTableNames.Region,
            new ConditionExpression(DataverseColumns.RegionName, ConditionOperator.Equal, regionName.Trim()));

        var entity = existing ?? new Entity(DataverseTableNames.Region);
        entity[DataverseColumns.RegionName] = regionName.Trim();
        if (zoneId.HasValue) entity[DataverseColumns.RegionZoneLookup] = new EntityReference(DataverseTableNames.Zone, zoneId.Value);

        if (existing == null) return await Task.FromResult(_client.Create(entity));
        _client.Update(entity);
        return existing.Id;
    }

    private async Task<Guid> UpsertDealerAsync(BscScoreDto score, Guid? zoneId, Guid? regionId)
    {
        var existing = await FindOneAsync(DataverseTableNames.Dealer,
            new ConditionExpression(DataverseColumns.DealerCode, ConditionOperator.Equal, score.DealerCode));

        var entity = existing ?? new Entity(DataverseTableNames.Dealer);
        entity[DataverseColumns.DealerCode] = score.DealerCode;
        entity[DataverseColumns.DealerName] = string.IsNullOrWhiteSpace(score.DealerName) ? score.DealerCode : score.DealerName;
        entity[DataverseColumns.IsActive] = true;
        if (zoneId.HasValue) entity[DataverseColumns.DealerZoneLookup] = new EntityReference(DataverseTableNames.Zone, zoneId.Value);
        if (regionId.HasValue) entity[DataverseColumns.DealerRegionLookup] = new EntityReference(DataverseTableNames.Region, regionId.Value);

        if (existing == null) return await Task.FromResult(_client.Create(entity));
        _client.Update(entity);
        return existing.Id;
    }

    private async Task<Guid> UpsertBscScoreAsync(BscScoreDto score, Guid dealerId, Guid? zoneId, Guid? regionId)
    {
        var existing = await FindOneAsync(DataverseTableNames.BscScore,
            new ConditionExpression(DataverseColumns.BscScoreDealerCode, ConditionOperator.Equal, score.DealerCode),
            new ConditionExpression(DataverseColumns.BscScoreFiscalYear, ConditionOperator.Equal, score.FiscalYear),
            new ConditionExpression(DataverseColumns.BscScoreMonth, ConditionOperator.Equal, score.Month));

        var entity = existing ?? new Entity(DataverseTableNames.BscScore);
        entity[DataverseColumns.BscScoreDealerLookup] = new EntityReference(DataverseTableNames.Dealer, dealerId);
        entity[DataverseColumns.BscScoreDealerCode] = score.DealerCode;
        entity[DataverseColumns.BscScoreDealerName] = score.DealerName;
        entity[DataverseColumns.BscScoreFiscalYear] = score.FiscalYear;
        entity[DataverseColumns.BscScoreMonth] = score.Month;
        entity[DataverseColumns.EarlyBirdScore] = score.EarlyBird.ProvisionalScore;
        entity[DataverseColumns.EarlyBirdQualification] = score.EarlyBird.Qualification;
        entity[DataverseColumns.EarlyBirdBand] = score.EarlyBird.Band;
        entity[DataverseColumns.FullYearScore] = score.FullYear.ProvisionalScore;
        entity[DataverseColumns.FullYearScorePercent] = score.FullYear.ProvisionalScorePercent;
        entity[DataverseColumns.FullYearBand] = score.FullYear.Band;
        if (zoneId.HasValue) entity[DataverseColumns.BscScoreZoneLookup] = new EntityReference(DataverseTableNames.Zone, zoneId.Value);
        if (regionId.HasValue) entity[DataverseColumns.BscScoreRegionLookup] = new EntityReference(DataverseTableNames.Region, regionId.Value);

        if (existing == null) return await Task.FromResult(_client.Create(entity));
        _client.Update(entity);
        return existing.Id;
    }

    private async Task<Guid> UpsertBusinessAreaAsync(Guid bscScoreId, BusinessAreaDto area, int sortOrder)
    {
        var existing = await FindOneAsync(DataverseTableNames.BscBusinessArea,
            new ConditionExpression(DataverseColumns.BusinessAreaScoreLookup, ConditionOperator.Equal, bscScoreId),
            new ConditionExpression(DataverseColumns.BusinessAreaSortOrder, ConditionOperator.Equal, sortOrder));

        var early = AreaTotalAsMetric(area.EarlyBirdTotal);
        var full = AreaTotalAsMetric(area.FullYearTotal);
        var entity = existing ?? new Entity(DataverseTableNames.BscBusinessArea);
        entity[DataverseColumns.BusinessAreaScoreLookup] = new EntityReference(DataverseTableNames.BscScore, bscScoreId);
        entity[DataverseColumns.BusinessAreaName] = area.AreaName;
        entity[DataverseColumns.BusinessAreaSortOrder] = sortOrder;
        entity[DataverseColumns.BusinessAreaEarlyMax] = early.MaxPoints;
        entity[DataverseColumns.BusinessAreaEarlyMin] = early.MinPoints;
        entity[DataverseColumns.BusinessAreaEarlyAchieved] = early.Achieved;
        entity[DataverseColumns.BusinessAreaFullMax] = full.MaxPoints;
        entity[DataverseColumns.BusinessAreaFullMin] = full.MinPoints;
        entity[DataverseColumns.BusinessAreaFullAchieved] = full.Achieved;

        if (existing == null) return await Task.FromResult(_client.Create(entity));
        _client.Update(entity);
        return existing.Id;
    }

    private async Task UpsertParameterAsync(Guid bscScoreId, Guid businessAreaId, ParameterDto parameter)
    {
        var existing = await FindOneAsync(DataverseTableNames.BscParameter,
            new ConditionExpression(DataverseColumns.ParameterScoreLookup, ConditionOperator.Equal, bscScoreId),
            new ConditionExpression(DataverseColumns.ParameterSNo, ConditionOperator.Equal, parameter.SNo.ToString(CultureInfo.InvariantCulture)));

        var entity = existing ?? new Entity(DataverseTableNames.BscParameter);
        entity[DataverseColumns.ParameterScoreLookup] = new EntityReference(DataverseTableNames.BscScore, bscScoreId);
        entity[DataverseColumns.ParameterBusinessAreaLookup] = new EntityReference(DataverseTableNames.BscBusinessArea, businessAreaId);
        entity[DataverseColumns.ParameterSNo] = parameter.SNo.ToString(CultureInfo.InvariantCulture);
        entity[DataverseColumns.ParameterName] = parameter.Parameter;
        entity[DataverseColumns.ParameterEarlyMax] = parameter.EarlyBird.MaxPoints;
        entity[DataverseColumns.ParameterEarlyMin] = parameter.EarlyBird.MinPoints;
        entity[DataverseColumns.ParameterEarlyAchieved] = parameter.EarlyBird.Achieved;
        entity[DataverseColumns.ParameterFullMax] = parameter.FullYear.MaxPoints;
        entity[DataverseColumns.ParameterFullMin] = parameter.FullYear.MinPoints;
        entity[DataverseColumns.ParameterFullAchieved] = parameter.FullYear.Achieved;
        entity[DataverseColumns.ParameterExcludeFromTotals] = parameter.ExcludeFromTotals;

        if (existing == null) _client.Create(entity);
        else _client.Update(entity);
        await Task.CompletedTask;
    }

    private async Task<Entity?> FindOneAsync(string tableName, params ConditionExpression[] conditions)
    {
        var query = new QueryExpression(tableName)
        {
            ColumnSet = new ColumnSet(true),
            TopCount = 1
        };

        foreach (var condition in conditions) query.Criteria.AddCondition(condition);

        var result = _client.RetrieveMultiple(query);
        return await Task.FromResult(result.Entities.FirstOrDefault());
    }

    private static MetricDto AreaTotalAsMetric(object value)
    {
        if (value is MetricDto metric) return metric;
        return new MetricDto { Achieved = Convert.ToDecimal(value, CultureInfo.InvariantCulture) };
    }
}

public static class DataverseTableNames
{
    public const string Zone = "new_zone";
    public const string Region = "new_region";
    public const string Dealer = "new_dealer";
    public const string BscScore = "new_bscscore";
    public const string BscBusinessArea = "new_bscbusinessarea";
    public const string BscParameter = "new_bscparameter";
}

public static class DataverseColumns
{
    public const string IsActive = "new_isactive";

    public const string ZoneName = "new_zonename";

    public const string RegionName = "new_regionname";
    public const string RegionZoneLookup = "new_zoneid";

    public const string DealerCode = "new_dealercode";
    public const string DealerName = "new_dealername";
    public const string DealerZoneLookup = "new_zoneid";
    public const string DealerRegionLookup = "new_regionid";

    public const string BscScoreDealerLookup = "new_dealerid";
    public const string BscScoreDealerCode = "new_dealercode";
    public const string BscScoreDealerName = "new_dealername";
    public const string BscScoreZoneLookup = "new_zoneid";
    public const string BscScoreRegionLookup = "new_regionid";
    public const string BscScoreFiscalYear = "new_fiscalyear";
    public const string BscScoreMonth = "new_month";
    public const string EarlyBirdScore = "new_earlybirdprovisionalscore";
    public const string EarlyBirdQualification = "new_earlybirdqualification";
    public const string EarlyBirdBand = "new_earlybirdband";
    public const string FullYearScore = "new_fullyearprovisionalscore";
    public const string FullYearScorePercent = "new_fullyearscorepercent";
    public const string FullYearBand = "new_fullyearband";

    public const string BusinessAreaScoreLookup = "new_bscscoreid";
    public const string BusinessAreaName = "new_areaname";
    public const string BusinessAreaSortOrder = "new_sortorder";
    public const string BusinessAreaEarlyMax = "new_earlybirdtotalmax";
    public const string BusinessAreaEarlyMin = "new_earlybirdtotalmin";
    public const string BusinessAreaEarlyAchieved = "new_earlybirdtotalachieved";
    public const string BusinessAreaFullMax = "new_fullyeartotalmax";
    public const string BusinessAreaFullMin = "new_fullyeartotalmin";
    public const string BusinessAreaFullAchieved = "new_fullyeartotalachieved";

    public const string ParameterScoreLookup = "new_bscscoreid";
    public const string ParameterBusinessAreaLookup = "new_businessareaid";
    public const string ParameterSNo = "new_sno";
    public const string ParameterName = "new_parametername";
    public const string ParameterEarlyMax = "new_earlybirdmaxpoints";
    public const string ParameterEarlyMin = "new_earlybirdminpoints";
    public const string ParameterEarlyAchieved = "new_earlybirdachieved";
    public const string ParameterFullMax = "new_fullyearmaxpoints";
    public const string ParameterFullMin = "new_fullyearminpoints";
    public const string ParameterFullAchieved = "new_fullyearachieved";
    public const string ParameterExcludeFromTotals = "new_excludefromtotals";
}
