Yes. These are the main API calls whose responses are used to dynamically build/update the UI through DOM manipulation.

**Admin Dashboard**

File:

`frontend/public/vanilla/admin/script.js`

1. Load summary table + access data

```js
apiGet('/bsc/score?summary=true')
apiGet('/access-control')
```

Used for:

```text
summary table rows
filters
credentials table
access control lists
```

2. Excel preview upload

```js
apiSendForm('/bsc/upload-excel', formData)
```

Used for:

```text
upload preview table rows
upload preview count/status
```

3. Save uploaded scorecards

```js
apiSend('POST', '/bsc/bulk-save', {
  scores: state.uploadPreviewRows,
  upsert: true
})
```

Then it reloads:

```js
apiGet('/bsc/score?summary=true')
apiGet('/access-control')
```

Used for:

```text
refreshing summary table and credentials/access-control UI
```

4. Save dealer access credential

```js
apiSend('POST', '/access-control/dealer-credential', credential)
```

Then reloads:

```js
apiGet('/access-control')
```

Used for:

```text
dealer credential rows
MSIL assignment dropdowns
```

5. Save zone/region lists

```js
apiSend('PUT', '/access-control', {
  zones,
  regions,
  msilPersons,
  dealerCredentials
})
```

Used for:

```text
zone list
region list
filter dropdown options
credential zone/region values
```

6. Save MSIL person

```js
apiSend('POST', '/access-control/msil-person', person)
```

Then reloads:

```js
apiGet('/access-control')
```

Used for:

```text
MSIL person table
MSIL assignment dropdowns
```

7. Delete access records

```js
apiSend('DELETE', '/access-control/zone/:id')
apiSend('DELETE', '/access-control/region/:id')
apiSend('DELETE', '/access-control/msil-person/:id')
apiSend('DELETE', '/access-control/dealer-credential/:id')
```

Then reloads access-control data and re-renders UI.

**MSIL Dashboard**

File:

`frontend/public/vanilla/msil/script.js`

1. Load score summaries and access mappings

```js
apiGet('/bsc/score?summary=true')
apiGet('/access-control')
```

Used for:

```text
assigned dealer filtering
summary table rows
zone/region/month/year filters
credentials/access table
pagination
```

The JS filters score rows by assigned dealer codes, then renders only allowed rows.

**Dealer Dashboard**

File:

`frontend/public/vanilla/dealer/script.js`

1. Fetch dealer score sheets

```js
apiGet(`/bsc/score?${query.toString()}`)
```

where query includes:

```text
dealerCode
month, optional
fiscalYear, optional
```

Used for:

```text
dealer score sheet top fields
summary info table
full detailed score table
note section
loading/empty states
```

**Shared Score Page**

File:

`frontend/public/vanilla/score/script.js`

1. Fetch one full score sheet

```js
apiGet(`/bsc/score/${scoreId}`)
```

Used for:

```text
top fields
summary info table
full detailed score table
note section
edit/view mode rendering
```

2. Save edited score sheet, admin only

```js
apiPut(`/bsc/score/${scoreId}`, currentScore)
```

Used for:

```text
save button state
toast messages
updated score data
redirect back to view mode
```

**Auth Page**

File:

`frontend/public/vanilla/auth/script.js`

1. Dealer/MSIL login

```js
fetch(`${API_BASE_URL}/access-control/login`, {
  method: 'POST',
  body: JSON.stringify({ username, password, role })
})
```

Used for:

```text
storing bsc_user in localStorage
redirecting to dealer/msil/admin dashboard
```

Dealer uses the returned `dealerCode` later to fetch its own score sheet.

**Backend APIs Feeding DOM Manipulation**

```text
GET    /api/bsc/score?summary=true
GET    /api/bsc/score/:id
GET    /api/bsc/score?dealerCode=...
POST   /api/bsc/upload-excel
POST   /api/bsc/bulk-save
PUT    /api/bsc/score/:id
GET    /api/access-control
POST   /api/access-control/login
POST   /api/access-control/dealer-credential
POST   /api/access-control/msil-person
PUT    /api/access-control
DELETE /api/access-control/...
```

In short:

```text
API returns JSON
 -> JS stores it in state/currentScore
 -> render functions use that data
 -> DOM gets rebuilt/updated
```