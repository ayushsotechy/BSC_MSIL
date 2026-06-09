const mongoose = require('mongoose');

const AccessZone = require('../models/AccessZone.model');
const AccessRegion = require('../models/AccessRegion.model');
const MsilAccess = require('../models/MsilAccess.model');
const DealerAccessCredential = require('../models/DealerAccessCredential.model');
const BscScore = require('../models/BscScore.model');

const DEFAULT_ZONES = ['CENTRAL', 'EAST', 'NORTH', 'SOUTH', 'SOUTH EAST', 'WEST'];
const DEFAULT_REGIONS = [
  'CENTRAL 1',
  'CENTRAL 2',
  'CENTRAL 3',
  'CENTRAL 4',
  'EAST 1',
  'EAST 2',
  'EAST 3',
  'NORTH 1',
  'NORTH 2',
  'NORTH 3',
  'NORTH 4',
  'SOUTH 1',
  'SOUTH 2',
  'SOUTH 3',
  'SOUTH EAST 1',
  'SOUTH EAST 2',
  'WEST 1',
  'WEST 2',
  'WEST 3',
];
const DEFAULT_MSIL_PERSONS = [
  { name: 'neha', mailId: 'neha@gmail.com', password: '1234' },
  { name: 'Sahil', mailId: 'sahil@gmail.com', password: '1234' },
  { name: 'Sandeep', mailId: 'sandeep@gmail.com', password: '1234' },
  { name: 'ayush', mailId: 'ayush@gmail.com', password: '1234' },
];

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

const cleanText = (value) => String(value || '').trim();

const normalizeName = (value) => cleanText(value).toLowerCase();

const isGeneratedDealerMail = (value) => /^dealer_?\d+@gmail\.com$/i.test(cleanText(value));

const ensureDefaultLists = async () => {
  if ((await AccessZone.countDocuments()) === 0) {
    await Promise.all(DEFAULT_ZONES.map((name) =>
      AccessZone.updateOne(
        { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        { $setOnInsert: { name } },
        { upsert: true }
      )
    ));
  }

  if ((await AccessRegion.countDocuments()) === 0) {
    await Promise.all(DEFAULT_REGIONS.map((name) =>
      AccessRegion.updateOne(
        { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        { $setOnInsert: { name } },
        { upsert: true }
      )
    ));
  }

  if ((await MsilAccess.countDocuments()) === 0) {
    await MsilAccess.insertMany(DEFAULT_MSIL_PERSONS);
  }
};

const getSerializedAccessControl = async () => {
  await ensureDefaultLists();
  await cleanupDealerCredentialsWithoutScores();

  const [zones, regions, msilPersons, dealerCredentials] = await Promise.all([
    AccessZone.find().sort({ createdAt: 1, name: 1 }).lean(),
    AccessRegion.find().sort({ createdAt: 1, name: 1 }).lean(),
    MsilAccess.find({ isActive: true }).sort({ createdAt: 1, name: 1 }).lean(),
    DealerAccessCredential.find({ isActive: true })
      .populate('zone')
      .populate('region')
      .populate('msilPersons')
      .sort({ createdAt: 1, dealerCode: 1 })
      .lean(),
  ]);

  return {
    zones: zones.map((zone) => ({
      id: String(zone._id),
      _id: String(zone._id),
      name: zone.name,
    })),
    regions: regions.map((region) => ({
      id: String(region._id),
      _id: String(region._id),
      name: region.name,
    })),
    msilPersons: msilPersons.map((person) => ({
      id: String(person._id),
      _id: String(person._id),
      name: person.name,
      mailId: person.mailId || '',
      password: person.password || '',
    })),
    dealerCredentials: dealerCredentials.map((credential) => ({
      id: String(credential._id),
      _id: String(credential._id),
      dealerCode: credential.dealerCode,
      dealerName: credential.dealerName || credential.dealerCode,
      mailId: credential.mailId || '',
      password: credential.password || '',
      zone: credential.zone?.name || '',
      region: credential.region?.name || '',
      zoneId: credential.zone?._id ? String(credential.zone._id) : '',
      regionId: credential.region?._id ? String(credential.region._id) : '',
      msilPersons: (credential.msilPersons || []).map((person) => String(person._id || person)),
    })),
  };
};

const upsertNamedList = async (Model, rows) => {
  const docs = [];

  for (const row of rows || []) {
    const name = cleanText(row?.name || row);
    if (!name) continue;

    const id = row?._id || row?.id;
    let doc = null;

    if (isObjectId(id)) {
      doc = await Model.findById(id);
    }

    if (!doc) {
      doc = await Model.findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    }

    if (doc) {
      doc.name = name;
      await doc.save();
    } else {
      doc = await Model.create({ name });
    }

    docs.push(doc);
  }

  return docs;
};

const upsertMsilPersons = async (rows) => {
  const docs = [];

  for (const row of rows || []) {
    const name = cleanText(row?.name);
    const mailId = cleanText(row?.mailId || row?.email).toLowerCase();
    const password = cleanText(row?.password) || '1234';

    if (!name && !mailId) continue;

    const id = row?._id || row?.id;
    let doc = null;

    if (isObjectId(id)) {
      doc = await MsilAccess.findById(id);
    }

    if (!doc && mailId) {
      doc = await MsilAccess.findOne({ mailId });
    }

    if (!doc && name) {
      doc = await MsilAccess.findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    }

    if (doc) {
      doc.name = name || doc.name;
      doc.mailId = mailId;
      doc.password = password;
      doc.isActive = true;
      await doc.save();
    } else {
      doc = await MsilAccess.create({ name: name || mailId, mailId, password });
    }

    docs.push(doc);
  }

  return docs;
};

const buildLookup = (docs) => {
  const lookup = new Map();
  docs.forEach((doc) => {
    lookup.set(String(doc._id), doc);
    lookup.set(normalizeName(doc.name), doc);
    if (doc.mailId) lookup.set(normalizeName(doc.mailId), doc);
  });
  return lookup;
};

const ensureUploadMsilPerson = async () => {
  const [ayush] = await upsertMsilPersons([
    { name: 'ayush', mailId: 'ayush@gmail.com', password: '1234' },
  ]);

  return ayush;
};

const serializeDealerCredential = (credential) => ({
  id: String(credential._id),
  _id: String(credential._id),
  dealerCode: credential.dealerCode,
  dealerName: credential.dealerName || credential.dealerCode,
  mailId: credential.mailId || '',
  password: credential.password || '',
  zone: credential.zone?.name || '',
  region: credential.region?.name || '',
  zoneId: credential.zone?._id ? String(credential.zone._id) : '',
  regionId: credential.region?._id ? String(credential.region._id) : '',
  msilPersons: (credential.msilPersons || []).map((person) => String(person._id || person)),
});

const serializeMsilPerson = (person) => ({
  id: String(person._id),
  _id: String(person._id),
  name: person.name || '',
  mailId: person.mailId || '',
  password: person.password || '',
});

const upsertDealerCredentials = async (rows, zoneLookup, regionLookup, msilLookup) => {
  const operations = [];

  for (const row of rows || []) {
    const dealerCode = cleanText(row?.dealerCode);
    if (!dealerCode) continue;

    const zoneDoc = zoneLookup.get(String(row?.zoneId || ''))
      || zoneLookup.get(normalizeName(row?.zone));
    const regionDoc = regionLookup.get(String(row?.regionId || ''))
      || regionLookup.get(normalizeName(row?.region));
    const msilIds = (row?.msilPersons || [])
      .map((personId) => msilLookup.get(String(personId)) || msilLookup.get(normalizeName(personId)))
      .filter(Boolean)
      .map((person) => person._id);

    const payload = {
      dealerCode,
      dealerName: cleanText(row?.dealerName) || dealerCode,
      mailId: cleanText(row?.mailId || row?.email).toLowerCase(),
      password: cleanText(row?.password) || '1234',
      zone: zoneDoc?._id,
      region: regionDoc?._id,
      msilPersons: msilIds,
      isActive: true,
    };

    operations.push({
      updateOne: {
        filter: { dealerCode },
        update: { $set: payload },
        upsert: true,
      },
    });
  }

  if (operations.length) {
    await DealerAccessCredential.bulkWrite(operations, { ordered: false });
  }
};

const cleanupDealerCredentialsWithoutScores = async () => {
  const dealerCodes = (await BscScore.distinct('dealerCode'))
    .map(cleanText)
    .filter(Boolean);

  if (!dealerCodes.length) {
    await DealerAccessCredential.deleteMany({});
    return;
  }

  await DealerAccessCredential.deleteMany({
    dealerCode: { $nin: dealerCodes },
  });
};

const syncDealerCredentialsFromScores = async (scores = []) => {
  await ensureDefaultLists();
  const ayush = await ensureUploadMsilPerson();

  const dealerMap = new Map();
  for (const score of scores || []) {
    const dealerCode = cleanText(score?.dealerCode);
    if (!dealerCode) continue;

    const key = dealerCode.toLowerCase();
    if (!dealerMap.has(key)) {
      dealerMap.set(key, {
        dealerCode,
        dealerName: cleanText(score?.dealerName) || dealerCode,
        zone: cleanText(score?.zone),
        region: cleanText(score?.region),
      });
    }
  }

  const dealerRows = [...dealerMap.values()];
  if (!dealerRows.length) {
    await cleanupDealerCredentialsWithoutScores();
    return;
  }

  await Promise.all([
    upsertNamedList(AccessZone, dealerRows.map((row) => row.zone).filter(Boolean)),
    upsertNamedList(AccessRegion, dealerRows.map((row) => row.region).filter(Boolean)),
  ]);

  const [zoneDocs, regionDocs, existingCredentials] = await Promise.all([
    AccessZone.find(),
    AccessRegion.find(),
    DealerAccessCredential.find({
      dealerCode: { $in: dealerRows.map((row) => row.dealerCode) },
    }).lean(),
  ]);
  const zoneLookup = buildLookup(zoneDocs);
  const regionLookup = buildLookup(regionDocs);
  const existingLookup = new Map(
    existingCredentials.map((credential) => [normalizeName(credential.dealerCode), credential])
  );

  const operations = dealerRows.map((row, index) => {
    const existing = existingLookup.get(normalizeName(row.dealerCode));
    const generatedMailId = `dealer_${index + 1}@gmail.com`;
    const setPayload = {
      dealerCode: row.dealerCode,
      dealerName: row.dealerName,
      zone: zoneLookup.get(normalizeName(row.zone))?._id,
      region: regionLookup.get(normalizeName(row.region))?._id,
      isActive: true,
    };

    if (!existing || !cleanText(existing.mailId) || isGeneratedDealerMail(existing.mailId)) {
      setPayload.mailId = generatedMailId;
    }
    if (!existing || !cleanText(existing.password)) {
      setPayload.password = '1234';
    }
    if ((!existing || !(existing.msilPersons || []).length) && ayush?._id) {
      setPayload.msilPersons = [ayush._id];
    }

    return {
      updateOne: {
        filter: { dealerCode: row.dealerCode },
        update: { $set: setPayload },
        upsert: true,
      },
    };
  });

  if (operations.length) {
    await DealerAccessCredential.bulkWrite(operations, { ordered: false });
  }

  await cleanupDealerCredentialsWithoutScores();
};

exports.syncDealerCredentialsFromScores = syncDealerCredentialsFromScores;
exports.cleanupDealerCredentialsWithoutScores = cleanupDealerCredentialsWithoutScores;

exports.getAccessControl = async (req, res, next) => {
  try {
    const data = await getSerializedAccessControl();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.syncAccessControl = async (req, res, next) => {
  try {
    const { zones = [], regions = [], msilPersons = [], dealerCredentials = [], returnData = true } = req.body || {};

    const zoneDocs = await upsertNamedList(AccessZone, zones);
    const regionDocs = await upsertNamedList(AccessRegion, regions);
    const msilDocs = await upsertMsilPersons(msilPersons);

    const zoneLookup = buildLookup(zoneDocs);
    const regionLookup = buildLookup(regionDocs);
    const msilLookup = buildLookup(msilDocs);

    await upsertDealerCredentials(dealerCredentials, zoneLookup, regionLookup, msilLookup);

    if (returnData === false) {
      return res.json({
        success: true,
        message: 'Access control saved successfully.',
        count: dealerCredentials.length,
      });
    }

    const data = await getSerializedAccessControl();
    return res.json({ success: true, message: 'Access control saved successfully.', data });
  } catch (error) {
    next(error);
  }
};

exports.upsertDealerCredential = async (req, res, next) => {
  try {
    await ensureDefaultLists();

    const row = req.body || {};
    const dealerCode = cleanText(row.dealerCode);
    if (!dealerCode) {
      return res.status(400).json({ message: 'Dealer code is required.' });
    }

    if (cleanText(row.zone)) {
      await upsertNamedList(AccessZone, [row.zone]);
    }
    if (cleanText(row.region)) {
      await upsertNamedList(AccessRegion, [row.region]);
    }

    const [zoneDocs, regionDocs, msilDocs] = await Promise.all([
      AccessZone.find(),
      AccessRegion.find(),
      MsilAccess.find({ isActive: true }),
    ]);
    const zoneLookup = buildLookup(zoneDocs);
    const regionLookup = buildLookup(regionDocs);
    const msilLookup = buildLookup(msilDocs);
    const zoneDoc = zoneLookup.get(String(row.zoneId || '')) || zoneLookup.get(normalizeName(row.zone));
    const regionDoc = regionLookup.get(String(row.regionId || '')) || regionLookup.get(normalizeName(row.region));
    const msilIds = (row.msilPersons || [])
      .map((personId) => msilLookup.get(String(personId)) || msilLookup.get(normalizeName(personId)))
      .filter(Boolean)
      .map((person) => person._id);

    await DealerAccessCredential.updateOne(
      { dealerCode },
      {
        $set: {
          dealerCode,
          dealerName: cleanText(row.dealerName) || dealerCode,
          mailId: cleanText(row.mailId || row.email).toLowerCase(),
          password: cleanText(row.password) || '1234',
          zone: zoneDoc?._id,
          region: regionDoc?._id,
          msilPersons: msilIds,
          isActive: true,
        },
      },
      { upsert: true }
    );

    const credential = await DealerAccessCredential.findOne({ dealerCode })
      .populate('zone')
      .populate('region')
      .populate('msilPersons')
      .lean();

    return res.json({
      success: true,
      message: 'Dealer credential saved successfully.',
      data: serializeDealerCredential(credential),
    });
  } catch (error) {
    next(error);
  }
};

exports.upsertMsilPerson = async (req, res, next) => {
  try {
    const [person] = await upsertMsilPersons([req.body || {}]);
    if (!person) {
      return res.status(400).json({ message: 'Please enter MSIL person name or mail ID.' });
    }

    return res.json({
      success: true,
      message: 'MSIL person saved successfully.',
      data: serializeMsilPerson(person),
    });
  } catch (error) {
    next(error);
  }
};

const findNamedDoc = async (Model, identifier) => {
  const value = cleanText(identifier);
  if (!value) return null;

  if (isObjectId(value)) {
    const doc = await Model.findById(value);
    if (doc) return doc;
  }

  return Model.findOne({ name: new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
};

exports.deleteZone = async (req, res, next) => {
  try {
    const zone = await findNamedDoc(AccessZone, req.params.id);
    if (!zone) {
      return res.status(404).json({ message: 'Zone not found.' });
    }

    await Promise.all([
      DealerAccessCredential.updateMany({ zone: zone._id }, { $unset: { zone: '' } }),
      AccessZone.deleteOne({ _id: zone._id }),
    ]);

    return res.json({ success: true, message: 'Zone removed successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.deleteRegion = async (req, res, next) => {
  try {
    const region = await findNamedDoc(AccessRegion, req.params.id);
    if (!region) {
      return res.status(404).json({ message: 'Region not found.' });
    }

    await Promise.all([
      DealerAccessCredential.updateMany({ region: region._id }, { $unset: { region: '' } }),
      AccessRegion.deleteOne({ _id: region._id }),
    ]);

    return res.json({ success: true, message: 'Region removed successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.deleteMsilPerson = async (req, res, next) => {
  try {
    const id = req.params.id;
    const query = isObjectId(id)
      ? { _id: id }
      : { $or: [{ name: new RegExp(`^${cleanText(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }, { mailId: cleanText(id).toLowerCase() }] };

    const person = await MsilAccess.findOne(query);
    if (!person) {
      return res.status(404).json({ message: 'MSIL person not found.' });
    }

    await Promise.all([
      DealerAccessCredential.updateMany({ msilPersons: person._id }, { $pull: { msilPersons: person._id } }),
      MsilAccess.updateOne({ _id: person._id }, { $set: { isActive: false } }),
    ]);

    return res.json({ success: true, message: 'MSIL person removed successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.deleteDealerCredential = async (req, res, next) => {
  try {
    const id = req.params.id;
    const query = isObjectId(id)
      ? { _id: id }
      : { dealerCode: new RegExp(`^${cleanText(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };

    const credential = await DealerAccessCredential.findOne(query);
    if (!credential) {
      return res.status(404).json({ message: 'Dealer credential not found.' });
    }

    await DealerAccessCredential.deleteOne({ _id: credential._id });

    return res.json({ success: true, message: 'Dealer credential removed successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.loginAccessCredential = async (req, res, next) => {
  try {
    const username = cleanText(req.body?.username).toLowerCase();
    const password = cleanText(req.body?.password);
    const role = cleanText(req.body?.role).toLowerCase();

    if (!username || !password || !['dealer', 'msil'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Username, password and role are required.' });
    }

    if (role === 'msil') {
      const person = await MsilAccess.findOne({
        isActive: true,
        $or: [{ name: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }, { mailId: username }],
      }).lean();

      if (!person || String(person.password || '').trim() !== password) {
        return res.status(401).json({ success: false, message: 'Invalid MSIL login credentials.' });
      }

      return res.json({
        success: true,
        user: {
          role: 'msil',
          name: person.name,
          dealerName: person.name,
          dealerCode: String(person._id),
          mailId: person.mailId || '',
        },
      });
    }

    const dealer = await DealerAccessCredential.findOne({
      isActive: true,
      $or: [
        { dealerCode: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        { mailId: username },
      ],
    })
      .populate('zone')
      .populate('region')
      .populate('msilPersons')
      .lean();

    if (!dealer || String(dealer.password || '').trim() !== password) {
      return res.status(401).json({ success: false, message: 'Invalid dealer login credentials.' });
    }

    return res.json({
      success: true,
      user: {
        role: 'dealer',
        name: dealer.dealerName || dealer.dealerCode,
        dealerName: dealer.dealerName || dealer.dealerCode,
        dealerCode: dealer.dealerCode,
        mailId: dealer.mailId || '',
        zone: dealer.zone?.name || '',
        region: dealer.region?.name || '',
        msilPersons: (dealer.msilPersons || []).map((person) => String(person._id || person)),
      },
    });
  } catch (error) {
    next(error);
  }
};
