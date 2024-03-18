const express = require("express");
require("dotenv").config();
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;

if (!uri) {
  throw new Error("Mongo URI is missing");
}

const dbClient = new MongoClient(uri);

app.listen(8080, () => {
  console.log("Server is running on port 8080");
});

app.get("/plants", async (req, res) => {
  let plants = [];
  //print request query params
  console.log("processing request...", req.query);
  const type = req.query.type;
  console.log(type);
  // if request query params is empty then return all plants
  const coll = dbClient.db("SoilSentry").collection("Plants");

  if (!type) {
    const plantsRes = coll.find();

    for await (const doc of plantsRes) {
      plants.push(doc);
    }

    res.send({ plants });
  } else {
    const plantsRes = coll.find({ type: type });

    for await (const doc of plantsRes) {
      plants.push(doc);
    }

    res.send({ plants });
  }
});

//Track telementry data
app.post("/track", async (req, res) => {
  try {
    //validate if body contains project ID and data type (soil moisture, temperature, humidity)
    const data = await req.body;
    console.log(data);

    //return early if body not provided
    if (!data) {
      return res.status(400).send("Body required");
    }

    //return early if body doesnt contain project ID and data type
    if (!data.user_id || !data.data) {
      return res.status(400).send("User ID and data required");
    }

    //return early if data doesnt contain type, value or unit
    if (!data.data.type || !data.data.value || !data.data.unit) {
      return res.status(400).send("Data type, value and unit required");
    }

    const coll = dbClient.db("SoilSentry").collection("Telemetry");
    const doc = {
      user_id: new ObjectId(data.user_id),
      date: new Date().toISOString(),
      data: {
        type: data.data.type,
        value: data.data.value,
        unit: data.data.unit,
      },
    };

    const dbRes = await coll.insertOne(doc);
    console.log(dbRes);

    return res.send("Tracked Successfully");
  } catch (error) {
    console.log(error);
    res.status(500).send("Error tracking data");
  }
});
