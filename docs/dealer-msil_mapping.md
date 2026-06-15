In Power Pages / Dataverse, dealer-to-MSI​L mapping should be done through a separate relationship table.

Use this table:

```text
Dealer MSIL Assignment
```

This table connects:

```text
Dealer  ←→  Contact
```

Where the `Contact` is the MSIL person.

**Tables Involved**

```text
Contact
Dealer
Dealer MSIL Assignment
```

**Contact Table**

This is where MSIL users live.

Important columns:

```text
Full Name
Email
Portal Role = MSIL
Is Active
```

Example:

```text
Ayush | ayush@gmail.com | MSIL | Active
Tanmay | tanmay@gmail.com | MSIL | Active
```

**Dealer Table**

This is where dealer master data lives.

Important columns:

```text
Dealer Code
Dealer Name
Zone
Region
Is Active
```

Example:

```text
EAST 3MITLAZ | Mittal Autozone | EAST | EAST 3
NORTH 1AKANS | Akanksha | NORTH | NORTH 1
```

**Dealer MSIL Assignment Table**

This is the actual mapping table.

Columns:

```text
Dealer
MSIL Contact
Is Active
```

Both `Dealer` and `MSIL Contact` are lookups.

Example rows:

```text
Dealer: EAST 3MITLAZ  | MSIL Contact: Ayush   | Active
Dealer: EAST 3MITLAZ  | MSIL Contact: Tanmay  | Active
Dealer: NORTH 1AKANS  | MSIL Contact: Ayush   | Active
```

This supports both rules:

```text
One MSIL person can govern many dealers.
One dealer can be governed by many MSIL persons.
```

**How Power Pages Will Use This**

When an MSIL person logs in:

```text
Logged-in Contact = Ayush
   ↓
Query Dealer MSIL Assignment
   ↓
Find all rows where MSIL Contact = Ayush
   ↓
Get Dealer list from those rows
   ↓
Fetch BSC Score rows only for those dealers
   ↓
Apply Zone / Region / Month / Year filters
   ↓
Show summary table
```

Example:

```text
Ayush logs in
   ↓
Dealer MSIL Assignment gives:
- EAST 3MITLAZ
- NORTH 1AKANS
- CENTRAL 18AAAA
   ↓
Dashboard shows only those dealers' scores
```

For admin:

```text
Admin logs in
   ↓
No Dealer MSIL Assignment restriction
   ↓
Fetch all BSC Score rows
```

For dealer:

```text
Dealer logs in
   ↓
Use Dealer Contact Mapping table
   ↓
Find dealer linked to logged-in Contact
   ↓
Fetch only that dealer's BSC Score rows
```

So the final access model is:

```text
Contact
  ├── if role = Admin → all dealers
  ├── if role = MSIL → Dealer MSIL Assignment → mapped dealers only
  └── if role = Dealer → Dealer Contact Mapping → own dealer only
```

This is the clean Dataverse version of what your MERN app is currently doing with `DealerAccessCredential.msilPersons`.