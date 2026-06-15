# Dataverse Table Mapping

This document shows the recommended Dataverse table structure for the BSC portal migration.

## Entity Relationship Diagram

```mermaid
erDiagram
  CONTACT ||--o{ DEALER_CONTACT_MAPPING : "login contact maps to dealer"
  CONTACT ||--o{ DEALER_MSIL_ASSIGNMENT : "MSIL contact assigned to dealers"

  ZONE ||--o{ REGION : "has regions"
  ZONE ||--o{ DEALER : "has dealers"
  REGION ||--o{ DEALER : "has dealers"

  DEALER ||--o{ DEALER_CONTACT_MAPPING : "has dealer login contacts"
  DEALER ||--o{ DEALER_MSIL_ASSIGNMENT : "governed by MSIL contacts"
  DEALER ||--o{ BSC_SCORE : "has score sheets"

  BSC_SCORE ||--o{ BSC_BUSINESS_AREA : "contains business areas"
  BSC_SCORE ||--o{ BSC_PARAMETER : "contains parameters"
  BSC_BUSINESS_AREA ||--o{ BSC_PARAMETER : "contains parameters"

  CONTACT {
    guid contactid PK
    string fullname
    string emailaddress1
    choice portal_role "Admin / MSIL / Dealer"
    string dealer_code
    boolean is_active
  }

  ZONE {
    guid zoneid PK
    string zone_name UK
  }

  REGION {
    guid regionid PK
    string region_name UK
    guid zoneid FK
  }

  DEALER {
    guid dealerid PK
    string dealer_code UK
    string dealer_name
    guid zoneid FK
    guid regionid FK
    boolean is_active
  }

  DEALER_CONTACT_MAPPING {
    guid mappingid PK
    guid dealerid FK
    guid contactid FK
    boolean is_active
  }

  DEALER_MSIL_ASSIGNMENT {
    guid assignmentid PK
    guid dealerid FK
    guid msil_contactid FK
    boolean is_active
  }

  BSC_SCORE {
    guid bscscoreid PK
    guid dealerid FK
    string dealer_code
    string dealer_name
    guid zoneid FK
    guid regionid FK
    string month
    string fiscal_year
    string previous_year_band
    string current_year_band
    string year_score
    string early_bird_provisional_score
    string early_bird_qualification
    string early_bird_band
    string full_year_provisional_score
    string full_year_score_percent
    string full_year_band
  }

  BSC_BUSINESS_AREA {
    guid businessareaid PK
    guid bscscoreid FK
    string area_name
    int sort_order
    decimal early_bird_total_max
    decimal early_bird_total_min
    decimal early_bird_total_achieved
    decimal full_year_total_max
    decimal full_year_total_min
    decimal full_year_total_achieved
  }

  BSC_PARAMETER {
    guid parameterid PK
    guid bscscoreid FK
    guid businessareaid FK
    string sno
    string parameter_name
    decimal early_bird_max_points
    decimal early_bird_min_points
    decimal early_bird_achieved
    decimal full_year_max_points
    decimal full_year_min_points
    decimal full_year_achieved
    boolean exclude_from_totals
  }
```

## Lookup Mapping

```text
Region.Zone -> Zone.ZoneId

Dealer.Zone -> Zone.ZoneId
Dealer.Region -> Region.RegionId

Dealer Contact Mapping.Dealer -> Dealer.DealerId
Dealer Contact Mapping.Contact -> Contact.ContactId

Dealer MSIL Assignment.Dealer -> Dealer.DealerId
Dealer MSIL Assignment.MSIL Contact -> Contact.ContactId

BSC Score.Dealer -> Dealer.DealerId
BSC Score.Zone -> Zone.ZoneId
BSC Score.Region -> Region.RegionId

BSC Business Area.BSC Score -> BSC Score.BscScoreId

BSC Parameter.BSC Score -> BSC Score.BscScoreId
BSC Parameter.BSC Business Area -> BSC Business Area.BusinessAreaId
```

## Role-Based Access Flow

```mermaid
flowchart TD
  A[Logged-in Contact] --> B{Portal Role}

  B -->|Admin| C[Fetch all BSC Score rows]
  C --> D[Filter by Month / Year / Zone / Region]
  D --> E[Open Score Detail by BSC Score Id]

  B -->|MSIL| F[Find Dealer MSIL Assignment rows]
  F --> G[Get mapped Dealers]
  G --> H[Fetch BSC Scores for mapped Dealers]
  H --> I[Filter by Zone / Region / Month / Year]
  I --> E

  B -->|Dealer| J[Find Dealer Contact Mapping]
  J --> K[Get Dealer]
  K --> L[Fetch BSC Scores for this Dealer only]
  L --> M[Show latest or selected Month / Year]
```

## Excel Upload Storage Flow

```mermaid
flowchart TD
  A[Excel File] --> B[Parse Excel into score JSON]
  B --> C[For each dealer score object]

  C --> D[Upsert Zone by Zone Name]
  D --> E[Upsert Region by Region Name]
  E --> F[Link Region to Zone]
  F --> G[Upsert Dealer by Dealer Code]
  G --> H[Link Dealer to Zone and Region]

  H --> I[Upsert BSC Score by Dealer + Fiscal Year + Month]
  I --> J[Loop businessAreas]
  J --> K[Upsert BSC Business Area by BSC Score + Sort Order]
  K --> L[Loop parameters]
  L --> M[Upsert BSC Parameter by BSC Score + SNo]

  H --> N[Ensure Dealer MSIL Assignment if default assignment is needed]
```

## Score Detail Fetch Flow

```mermaid
flowchart TD
  A[Selected BSC Score Id] --> B[Fetch BSC Score row]
  B --> C[Fetch related BSC Business Areas]
  C --> D[Sort Business Areas by Sort Order]
  B --> E[Fetch related BSC Parameters]
  E --> F[Group Parameters by Business Area]
  F --> G[Sort Parameters by SNo]
  G --> H[Compose nested JSON]
  H --> I[Render score sheet table]
```

## Nested JSON Returned To Frontend

Power Automate should compose the Dataverse rows back into this shape for the current frontend rendering logic:

```js
{
  id: "bsc-score-guid",
  dealerCode: "EAST 3MTLAZ",
  dealerName: "MITTAL AUTOZONE",
  zone: "EAST",
  region: "EAST 3",
  month: "August",
  fiscalYear: "2028",
  earlyBird: {
    provisionalScore: "327/1000",
    qualification: "N",
    band: "NO BAND"
  },
  fullYear: {
    provisionalScore: "327/1000",
    provisionalScorePercent: "42%",
    band: "NO BAND"
  },
  businessAreas: [
    {
      areaName: "Sales Performance",
      parameters: [
        {
          sNo: "1",
          parameter: "All Models Wholesales Performance",
          earlyBird: {
            maxPoints: 40,
            minPoints: 0,
            achieved: 40
          },
          fullYear: {
            maxPoints: 40,
            minPoints: 0,
            achieved: 40
          }
        }
      ]
    }
  ]
}
```

## Build Order

```text
1. Zone
2. Region
3. Dealer
4. Dealer Contact Mapping
5. Dealer MSIL Assignment
6. BSC Score
7. BSC Business Area
8. BSC Parameter
```

Use the existing Dataverse `Contact` table for Admin, MSIL, and Dealer portal users.
