# BSC Excel Parsing Flow

This document explains how the current Node.js Excel parser works in `backend/utils/bscExcelParser.js`.

The parser converts the uploaded BSC Excel workbook into the nested JSON shape used by the backend, frontend score sheet table, and future Dataverse/Azure Function migration.

## Main Entry Points

The parser exports two functions:

```js
parseBscWorkbook(buffer, options)
parseBscWorkbookWithMetadata(buffer, options)
```

Current upload flow uses:

```js
parseBscWorkbookWithMetadata(req.file.buffer, { fiscalYear, month })
```

This returns:

```js
{
  scores: [],
  accessCredentials: []
}
```

`scores` contains the parsed BSC scorecards.

`accessCredentials` is preview metadata generated from the Excel rows. The actual database credential sync happens later in `accessControl.controller.js`.

## Workbook Reading

The uploaded Excel file is received as a raw buffer.

```js
const workbook = XLSX.read(buffer, { type: 'buffer' });
```

The parser then searches for Early Bird and Full Year sheets.

Early Bird sheet names accepted:

```text
Early Bird
EarlyBird
Early Bird Points
Early Year
Early Year Points
```

Full Year sheet names accepted:

```text
Full Year
FullYear
Full Year Points
```

Sheet names are normalized before matching. That means casing, special characters, spacing, and `&` differences are handled.

Example:

```js
normalize("Early-Bird Points")
```

becomes:

```text
early bird points
```

## Two Parsing Modes

The parser supports two formats:

```text
1. Wide template format
2. Header-name fallback format
```

The current BSC Excel format mainly uses the wide template path.

## Wide Template Detection

The parser detects the wide template by checking the header row.

It searches for a row where:

```text
Column C = BSC Parent Dealer Code
Column E = All Models Wholesales Performance
```

If that row exists, the file is treated as the wide template.

After the header row is found, every row below it is treated as a dealer score row.

## Base Score Object

Before reading Excel values, the parser creates a full default score object.

The BSC structure is hardcoded in the parser.

That means the Excel does not define the table structure. The code already knows:

```text
8 business areas
31 parameters
Early Bird metric fields
Full Year metric fields
Bonus/excluded parameters
```

The top-level score object contains:

```js
{
  dealerCode,
  dealerName,
  zone,
  region,
  fiscalYear,
  month,
  provisionalType,
  earlyBird,
  fullYear,
  businessAreas
}
```

Default fiscal year:

```text
FY 26-27
```

Default month:

```text
Apr'26
```

These defaults are used only if the upload request does not pass `fiscalYear` and `month`.

## Business Areas

The parser creates these 8 business areas:

```text
1. Sales Performance
2. Sales Quality Performance
3. Service Performance
4. Service Quality
5. Parts & Accessories Performance
6. True Value
7. Dealer Financials
8. Dealer Infrastructure
```

Each business area has predefined parameters.

Example:

```js
area('Sales Performance', [
  parameter(1, 'All Models Wholesales Performance', metric(40, 0), metric(40, 0)),
  parameter(2, 'ARENA SUV Models Wholesales Performance', metric(60, 0), metric(60, 0)),
])
```

## Parameters

There are 31 predefined parameters.

Each parameter has:

```js
{
  sNo,
  parameter,
  accessConditionMet,
  earlyBird: {
    maxPoints,
    minPoints,
    achieved
  },
  fullYear: {
    maxPoints,
    minPoints,
    achieved
  },
  excludeFromTotals
}
```

Some parameters are marked as bonus/excluded from totals:

```text
24. End of Life Vehicle Scrap Penetration - ARENA (Bonus Parameter)
29. Charging Infrastructure (Bonus Parameter)
```

These still appear in the score sheet table, but they are excluded when totals are calculated.

## Dealer Metadata Columns

In the wide template, dealer details are read from fixed columns:

```text
A = Zone
B = Region
C = BSC Parent Dealer Code
D = Dealer Name
```

So each row becomes one dealer scorecard.

## Wide Template Column Mapping

The parser uses fixed column ranges to read values.

### Early Bird Columns

```text
Parameter achieved values: E:AI
Business area achieved totals: AP:AW
Achieved grand total: AX

Parameter max points: AZ:CD
Business area max totals: CG:CN
Max grand total: CO

Parameter min points: CQ:DU
Business area min totals: DX:EE
Min grand total: EF

Score column: AK
Qualification column: AM
Band column: AN
Default denominator: 1000
```

### Full Year Columns

```text
Parameter achieved values: E:AI
Business area achieved totals: BJ:BR
Achieved grand total: BR

Parameter max points: BT:CX
Business area max totals: DA:DI
Max grand total: DI

Parameter min points: DK:EO
Business area min totals: ER:EZ
Min grand total: EZ

Score column: AK
Score percent column: AL
Band column: AM
Denominator column: DI
```

## How Parameter Values Are Filled

The function `applyMetricRange` reads a range and applies its values to all 31 parameters.For Dataverse / Power Pages, make these tables.

**1. Contact**

Use the existing Dataverse `Contact` table.

Add custom columns:

```text
Portal Role
Dealer Code
Is Active
```

Roles:

```text
Admin
MSIL
Dealer
```

Purpose:

```text
Stores login users for Admin, MSIL, and Dealer.
```

**2. Zone**

Custom table.

Columns:

```text
Zone Name
Is Active
```

Purpose:

```text
Master list of zones.
```

**3. Region**

Custom table.

Columns:

```text
Region Name
Zone lookup
Is Active
```

Purpose:

```text
Master list of regions.
```

Relationship:

```text
Region → Zone
```

**4. Dealer**

Custom table.

Columns:

```text
Dealer Code
Dealer Name
Zone lookup
Region lookup
Is Active
```

Purpose:

```text
Master list of dealers.
```

Relationships:

```text
Dealer → Zone
Dealer → Region
```

**5. Dealer Contact Mapping**

Custom table.

Columns:

```text
Contact lookup
Dealer lookup
Is Active
```

Purpose:

```text
Links dealer login Contact to a Dealer.
```

Relationship:

```text
Contact → Dealer Contact Mapping → Dealer
```

**6. Dealer MSIL Assignment**

Custom table.

Columns:

```text
MSIL Contact lookup
Dealer lookup
Is Active
```

Purpose:

```text
Links MSIL users to dealers they can govern/view.
```

Relationship:

```text
Contact → Dealer MSIL Assignment → Dealer
```

**7. BSC Score**

Custom table.

Columns:

```text
Dealer lookup
Dealer Code
Dealer Name
Zone lookup
Zone Name
Region lookup
Region Name
Fiscal Year
Month
Previous Year Band
Current Year Band
Year Score
Early Bird Provisional Score
Early Bird Qualification
Early Bird Band
Full Year Provisional Score
Full Year Score %
Full Year Band
```

Purpose:

```text
One score sheet header/summary row per Dealer + Month + Fiscal Year.
```

Unique key:

```text
Dealer + Fiscal Year + Month
```

**8. BSC Business Area**

Custom table.

Columns:

```text
BSC Score lookup
Area Name
Sort Order
Early Bird Total Max
Early Bird Total Min
Early Bird Total Achieved
Full Year Total Max
Full Year Total Min
Full Year Total Achieved
```

Purpose:

```text
Stores the 8 business sections inside each score sheet.
```

Relationship:

```text
BSC Score → BSC Business Area
```

**9. BSC Parameter**

Custom table.

Columns:

```text
BSC Score lookup
BSC Business Area lookup
S.No.
Parameter Name
Early Bird Max Points
Early Bird Min Points
Early Bird Achieved
Full Year Max Points
Full Year Min Points
Full Year Achieved
Exclude From Totals
```

Purpose:

```text
Stores the 31 score sheet parameter rows.
```

Relationship:

```text
BSC Score → BSC Parameter
BSC Business Area → BSC Parameter
```

**Final Table List**

```text
1. Contact
2. Zone
3. Region
4. Dealer
5. Dealer Contact Mapping
6. Dealer MSIL Assignment
7. BSC Score
8. BSC Business Area
9. BSC Parameter
```

This structure keeps the current app logic intact, but converts the MongoDB nested JSON into clean Dataverse relational tables.

Example:

```js
applyMetricRange(score, row, 'fullYear', 'achieved', 'E', 'AI')
```

This does:

```text
Read E:AI from the row
Loop through the 31 parameters
Set parameter.fullYear.achieved for each parameter
```

Similar calls fill:

```text
earlyBird.achieved
earlyBird.maxPoints
earlyBird.minPoints
fullYear.achieved
fullYear.maxPoints
fullYear.minPoints
```

## Dynamic Range Safety

Even though preferred ranges are defined, the parser has safety logic for max/min columns.

It checks whether the expected parameter headers are present at the preferred start column.

If not, it searches nearby columns for a matching 31-parameter block.

This helps when the Excel template shifts slightly.

The target is still the same:

```text
31 parameter values in order
```

## Business Area Subtotals

The parser tries to read business area totals directly from the Excel subtotal columns.

Example:

```text
Full Year achieved totals: BJ:BR
Full Year max totals: DA:DI
Full Year min totals: ER:EZ
```

The subtotal values map to the 8 business areas in order:

```text
1. Sales Performance
2. Sales Quality Performance
3. Service Performance
4. Service Quality
5. Parts & Accessories Performance
6. True Value
7. Dealer Financials
8. Dealer Infrastructure
```

If the parser cannot confidently detect the subtotal headers, it calculates totals from the parameters.

Formula:

```text
business area total = sum of non-excluded parameters in that business area
```

## Grand Totals

Grand totals are also read from fixed Excel columns first.

Early Bird:

```text
Achieved grand total: AX
Max grand total: CO
Min grand total: EF
```

Full Year:

```text
Achieved grand total: BR
Max grand total: DI
Min grand total: EZ
```

If a grand total cell is blank or resolves to zero, the parser falls back to calculated totals.

Formula:

```text
grand total = sum of business area totals
```

## Full Year Summary

For Full Year, the parser fills:

```js
score.fullYear = {
  provisionalScore,
  provisionalScorePercent,
  qualification,
  total,
  band
}
```

`provisionalScore` is built like:

```text
scoreValue / denominator
```

Example:

```text
327/1000
```

The score value is read from:

```text
Full Year Provisional Score column
fallback: AK
fallback: calculated achieved grand total
```

The denominator is read from:

```text
DI
fallback: max grand total
```

## Early Bird Summary

For Early Bird, the parser fills:

```js
score.earlyBird = {
  provisionalScore,
  provisionalScorePercent,
  qualification,
  total,
  band
}
```

The denominator is fixed to:

```text
1000
```

Qualification is read from:

```text
Early Year Band Qualification
Early Bird Qualification
fallback column AM
fallback value N
```

Band is read from:

```text
Early Year Band
Early Bird Band
fallback column AN
fallback value NO BAND
```

## Early Bird And Full Year Merge

The parser uses `dealerCode` as the merge key.

Flow:

```text
Read Full Year rows first
Create score object per dealer
Store in scoreMap using dealerCode

Read Early Bird rows next
Find existing score by dealerCode
Add Early Bird values into the same score object
```

Final result:

```text
One dealer code = one combined score object
```

So each final score contains both:

```text
earlyBird
fullYear
businessAreas
```

## Access Credential Preview

After wide-template parsing, the parser creates a preview credential object for each dealer:

```js
{
  id: 'excel-dealer-1',
  dealerCode,
  dealerName,
  mailId: 'dealer_1@gmail.com',
  password: '1234',
  zone,
  region,
  msilPersons: ['ayush']
}
```

This is only preview data returned with the upload response.

The actual credential database update happens after bulk save, inside:

```text
backend/controllers/accessControl.controller.js
syncDealerCredentialsFromScores(scores)
```

## Header-Name Fallback Parser

If the workbook is not detected as a wide template, the parser uses a fallback mode.

In fallback mode:

```text
Columns are matched by header names instead of fixed Excel letters.
```

The mappings are stored in:

```js
PARAMETER_COLUMNS
```

Example:

```js
{
  area: 'Sales Performance',
  parameter: 'Maruti Suzuki Smart Finance',
  columns: ['Maruti Suzuki Smart Finance', 'Smart Finance']
}
```

This mode is more flexible, but less important for the current BSC template.

## Final JSON Shape

The parser returns one object per dealer.

Example simplified shape:

```js
{
  dealerCode: 'EAST 3MITLAZ',
  dealerName: 'MITTAL AUTOZONE',
  zone: 'EAST',
  region: 'EAST 3',
  fiscalYear: '2028',
  month: 'August',
  provisionalType: 'provisional',
  earlyBird: {
    provisionalScore: '317/1000',
    provisionalScorePercent: '',
    qualification: 'N',
    band: 'NO BAND',
    total: {
      achieved: 317,
      maxPoints: 1000,
      minPoints: -365
    }
  },
  fullYear: {
    provisionalScore: '325/1000',
    provisionalScorePercent: '41%',
    qualification: 'N',
    band: 'NO BAND',
    total: {
      achieved: 325,
      maxPoints: 1000,
      minPoints: -365
    }
  },
  businessAreas: [
    {
      areaName: 'Sales Performance',
      earlyBirdTotal: {
        achieved: 200,
        maxPoints: 230,
        minPoints: 0
      },
      fullYearTotal: {
        achieved: 200,
        maxPoints: 230,
        minPoints: 0
      },
      parameters: [
        {
          sNo: 1,
          parameter: 'All Models Wholesales Performance',
          accessConditionMet: '',
          earlyBird: {
            maxPoints: 40,
            minPoints: 0,
            achieved: 40
          },
          fullYear: {
            maxPoints: 40,
            minPoints: 0,
            achieved: 40
          },
          excludeFromTotals: false
        }
      ]
    }
  ]
}
```

## Dataverse Mapping Impact

This parser output maps naturally into Dataverse:

```text
score top-level fields -> BSC Score table
score.zone -> Zone table
score.region -> Region table
score.dealerCode / dealerName -> Dealer table
score.businessAreas[] -> BSC Business Area table
businessArea.parameters[] -> BSC Parameter table
```

The parser logic itself should only need changes if one of these changes:

```text
Excel sheet names
Excel column layout
Number of parameters
Business area names/order
Month/fiscal-year format
Dataverse expects a different JSON shape
```

Otherwise, most Dataverse work should happen in the saving layer, not in the parser.
