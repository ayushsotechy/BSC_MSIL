Use Ctrl+Shift+V to look in the markdown format


Below is the final clean Dataverse structure to use for saving and fetching data without breaking the current app flow.

**1. Contact**

Use existing Dataverse `Contact` table for login users.

Columns to add:

| Column | Type | Purpose |
|---|---|---|
| Portal Role | Choice: Admin, MSIL, Dealer | Decides user access |
| Dealer Code | Text | Optional helper for dealer contact |
| Is Active | Yes/No | Active/inactive user |

Used for:

```text 
Admin login
MSIL login
Dealer login
```

**2. Zone**

| Column | Type | Purpose |
|---|---|---|
| Zone Name | Text, unique | Example: NORTH, SOUTH, EAST |

Key:

```text
Zone Name
```

**3. Region**

| Column | Type | Purpose |
|---|---|---|
| Region Name | Text, unique | Example: EAST 3 |
| Zone | Lookup to Zone | Region belongs to zone |

Mapping:

```text
Region.Zone -> Zone
```

Key:

```text
Region Name
```

**4. Dealer**

| Column | Type | Purpose |
|---|---|---|
| Dealer Code | Text, unique | Main dealer identifier |
| Dealer Name | Text | Dealer display name |
| Zone | Lookup to Zone | Dealer zone |
| Region | Lookup to Region | Dealer region |
| Is Active | Yes/No | Active dealer |

Mappings:

```text
Dealer.Zone -> Zone
Dealer.Region -> Region
```

Key:

```text
Dealer Code
```

**5. Dealer Contact Mapping**

Maps dealer login contacts to actual dealer records.

| Column | Type | Purpose |
|---|---|---|
| Dealer | Lookup to Dealer | Dealer business record |
| Contact | Lookup to Contact | Dealer login contact |
| Is Active | Yes/No | Active mapping |

Mappings:

```text
Dealer Contact Mapping.Dealer -> Dealer
Dealer Contact Mapping.Contact -> Contact
```

Used for dealer login:

```text
Logged-in Contact -> Dealer Contact Mapping -> Dealer -> BSC Scores
```

**6. Dealer MSIL Assignment**

Maps MSIL contacts to dealers they can view.

| Column | Type | Purpose |
|---|---|---|
| Dealer | Lookup to Dealer | Assigned dealer |
| MSIL Contact | Lookup to Contact | Assigned MSIL person |
| Is Active | Yes/No | Active assignment |

Mappings:

```text
Dealer MSIL Assignment.Dealer -> Dealer
Dealer MSIL Assignment.MSIL Contact -> Contact
```

Used for MSIL login:

```text
Logged-in MSIL Contact -> Dealer MSIL Assignment -> Dealers -> BSC Scores
```

**7. BSC Score**

This is the main score-sheet header table.

| Column | Type | Purpose |
|---|---|---|
| Dealer | Lookup to Dealer | Score belongs to dealer |
| Dealer Code | Text | Snapshot from Dealer |
| Dealer Name | Text | Snapshot from Dealer |
| Zone | Lookup to Zone | Snapshot/filter |
| Region | Lookup to Region | Snapshot/filter |
| Month | Text/Choice | Score month |
| Fiscal Year | Text | Score fiscal year |
| Previous Year Band | Text | Summary field |
| Current Year Band | Text | Summary field |
| Year Score | Text or Decimal | Summary score |
| Early Bird Provisional Score | Text | Example: 327/1000 |
| Early Bird Qualification | Text | Y/N |
| Early Bird Band | Text | Band |
| Full Year Provisional Score | Text | Example: 327/1000 |
| Full Year Score Percent | Text | Example: 42% |
| Full Year Band | Text | Band |

Mappings:

```text
BSC Score.Dealer -> Dealer
BSC Score.Zone -> Zone
BSC Score.Region -> Region
```

Key:

```text
Dealer + Fiscal Year + Month
```

Used for:

```text
Admin summary table
MSIL summary table
Dealer score list
Score detail entry point
```

**8. BSC Business Area**

Represents sections like Sales Performance, Service Performance, True Value, etc.

| Column | Type | Purpose |
|---|---|---|
| BSC Score | Lookup to BSC Score | Parent score sheet |
| Area Name | Text | Example: Sales Performance |
| Sort Order | Whole Number | Display order |
| Early Bird Total Max | Decimal | Area total |
| Early Bird Total Min | Decimal | Area total |
| Early Bird Total Achieved | Decimal | Area total |
| Full Year Total Max | Decimal | Area total |
| Full Year Total Min | Decimal | Area total |
| Full Year Total Achieved | Decimal | Area total |

Mapping:

```text
BSC Business Area.BSC Score -> BSC Score
```

Key:

```text
BSC Score + Sort Order
```

Used to rebuild:

```js
score.businessAreas[]
```

**9. BSC Parameter**

Represents each row inside a business area.

| Column | Type | Purpose |
|---|---|---|
| BSC Score | Lookup to BSC Score | Parent score sheet |
| BSC Business Area | Lookup to BSC Business Area | Parent business area |
| SNo | Text | Use text to support 14a/14b if needed |
| Parameter Name | Text | Parameter label |
| Early Bird Max Points | Decimal | Early max |
| Early Bird Min Points | Decimal | Early min |
| Early Bird Achieved | Decimal | Early achieved |
| Full Year Max Points | Decimal | Full max |
| Full Year Min Points | Decimal | Full min |
| Full Year Achieved | Decimal | Full achieved |
| Exclude From Totals | Yes/No | For bonus/excluded parameters |

Mappings:

```text
BSC Parameter.BSC Score -> BSC Score
BSC Parameter.BSC Business Area -> BSC Business Area
```

Key:

```text
BSC Score + SNo
```

Used to rebuild:

```js
score.businessAreas[].parameters[]
```

**Saving Flow**

When Excel data is parsed:

```text
1. Upsert Zone by Zone Name
2. Upsert Region by Region Name, link Region -> Zone
3. Upsert Dealer by Dealer Code, link Dealer -> Zone and Region
4. Upsert BSC Score by Dealer + Fiscal Year + Month
5. Loop businessAreas
   -> upsert BSC Business Area by BSC Score + Sort Order
6. Loop parameters
   -> upsert BSC Parameter by BSC Score + SNo
7. Create Dealer Contact Mapping if needed
8. Create Dealer MSIL Assignment if needed
```

**Fetching Flow**

Admin summary:

```text
Fetch BSC Score rows
 -> include Dealer, Zone, Region
 -> show all rows
```

MSIL summary:

```text
Current Contact
 -> Dealer MSIL Assignment
 -> mapped Dealers
 -> BSC Score rows for mapped Dealers
 -> filter by Zone, Region, Month, Fiscal Year
```

Dealer score:

```text
Current Contact
 -> Dealer Contact Mapping
 -> Dealer
 -> BSC Score rows for that Dealer only
 -> show latest or selected Month/Fiscal Year
```

Score detail:

```text
Selected BSC Score
 -> fetch BSC Score
 -> fetch related BSC Business Areas
 -> fetch related BSC Parameters
 -> compose nested JSON
```

**Nested JSON To Return To Frontend**

Power Automate should return this shape for the detail page:

```js
{
  "id": "bsc-score-guid",
  "dealerCode": "NORTH 1AKANS",
  "dealerName": "AKANKSHA (M)",
  "zone": "NORTH",
  "region": "NORTH 1",
  "month": "August",
  "fiscalYear": "2028",
  "previousYearBand": "N/A",
  "currentYearBand": "NO BAND",
  "yearScore": "327/1000",
  "earlyBird": {
    "provisionalScore": "327/1000",
    "qualification": "N",
    "band": "NO BAND"
  },
  "fullYear": {
    "provisionalScore": "327/1000",
    "provisionalScorePercent": "42%",
    "band": "NO BAND"
  },
  "businessAreas": [
    {
      "areaName": "Sales Performance",
      "parameters": [
        {
          "sNo": "1",
          "parameter": "All Models Wholesales Performance",
          "excludeFromTotals": false,
          "earlyBird": {
            "maxPoints": 40,
            "minPoints": 0,
            "achieved": 40
          },
          "fullYear": {
            "maxPoints": 40,
            "minPoints": 0,
            "achieved": 40
          }
        }
      ]
    }
  ]
}
```

Final build order:

```text
Contact columns
Zone
Region
Dealer
Dealer Contact Mapping
Dealer MSIL Assignment
BSC Score
BSC Business Area
BSC Parameter
```