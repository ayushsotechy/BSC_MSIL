Here’s the crisp developer-friendly version.

**Excel Parsing Overview**

The uploaded Excel file is parsed in:

```text
backend/utils/bscExcelParser.js
```

Main function used:

```js
parseBscWorkbookWithMetadata(buffer, { fiscalYear, month })
```

**1. Workbook Is Read**

The uploaded Excel file comes as a buffer.

```js
XLSX.read(buffer, { type: 'buffer' })
```

The parser looks for these sheets:

```text
Early Bird / EarlyBird / Early Year
Full Year / FullYear
```

**2. Parser Detects The BSC Template**

It checks if the sheet has the expected wide-template header:

```text
Column C = BSC Parent Dealer Code
Column E = All Models Wholesales Performance
```

If found, it treats the sheet as the current BSC wide template.

**3. Dealer Details Are Read From Fixed Columns**

For each dealer row:

```text
A = Zone
B = Region
C = Dealer Code
D = Dealer Name
```

Each row becomes one dealer scorecard.

**4. BSC Structure Is Predefined In Code**

The parser already has the score sheet structure hardcoded:

```text
8 Business Areas
31 Parameters
Early Bird fields
Full Year fields
Bonus/excluded parameters
```

Excel does not define the table structure. Excel only provides the values.

**5. Scores Are Read From Fixed Ranges**

For each dealer row, the parser reads score values from fixed ranges.

Early Bird:

```text
Achieved: E:AI
Max Points: AZ:CD
Min Points: CQ:DU
Totals: AP:AW, CG:CN, DX:EE
Grand totals: AX, CO, EF
```

Full Year:

```text
Achieved: E:AI
Max Points: BT:CX
Min Points: DK:EO
Totals: BJ:BR, DA:DI, ER:EZ
Grand totals: BR, DI, EZ
```

**6. Values Are Filled Into JSON**

The parser loops through the 31 parameters and fills:

```js
parameter.earlyBird.achieved
parameter.earlyBird.maxPoints
parameter.earlyBird.minPoints

parameter.fullYear.achieved
parameter.fullYear.maxPoints
parameter.fullYear.minPoints
```

**7. Totals Are Read Or Calculated**

The parser first tries to read subtotal and grand-total columns from Excel.

If totals are missing or headers are not detected, it calculates totals from parameter values.

Bonus parameters are excluded from totals.

**8. Early Bird And Full Year Are Merged**

The parser reads Full Year rows and Early Bird rows separately, then merges them by:

```text
dealerCode
```

Final result:

```text
One dealer = one combined score object
```

containing both `earlyBird` and `fullYear`.

**9. Final Output**

The parser returns:

```js
{
  scores: [
    {
      dealerCode,
      dealerName,
      zone,
      region,
      fiscalYear,
      month,
      earlyBird,
      fullYear,
      businessAreas: [
        {
          areaName,
          earlyBirdTotal,
          fullYearTotal,
          parameters: []
        }
      ]
    }
  ],
  accessCredentials: []
}
```

In MongoDB, this whole object is saved as one nested document.

In Dataverse, this same object will be split into:

```text
BSC Score
BSC Business Area
BSC Parameter
```

Parser can remain mostly the same as long as the Excel format remains the same.