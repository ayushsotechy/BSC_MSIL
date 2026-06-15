For Dataverse / Power Pages, make these tables.

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