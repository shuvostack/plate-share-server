require("dotenv").config();
console.log("Connecting with:", process.env.DB_USER, process.env.DB_PASS);
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;


// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6nbocxd.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("plateShare_db");
    const foodsCollection = db.collection("foods");
    const requestsCollection = db.collection("foodRequests");
    const usersCollection = db.collection("users");

    app.get("/", (req, res) => {
      res.send("PlateShare server is running");
    });

    // get all available foods
    app.get("/foods", async (req, res) => {
      const result = await foodsCollection
        .find({ food_status: "Available" })
        .toArray();
      res.send(result);
    });

    // get featured foods
    app.get("/featured-foods", async (req, res) => {
      const cursor = foodsCollection
        .find()
        .sort({ food_quantity: -1 })
        .limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    // add new food 
    app.post("/foods", async (req, res) => {
      const newFood = req.body;
      console.log("🆕 Received new food:", newFood);
      newFood.food_status = "Available";
      const result = await foodsCollection.insertOne(newFood);
      console.log("✅ Insert result:", result);
      res.send(result);
    });

    // Get single food by ID
    app.get("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.findOne(query);
      res.send(result);
    });

    // Update food 
    app.patch("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const updatedFood = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          food_name: updatedFood.food_name,
          food_image: updatedFood.food_image,
          food_quantity: updatedFood.food_quantity,
          pickup_location: updatedFood.pickup_location,
          expire_date: updatedFood.expire_date,
          additional_notes: updatedFood.additional_notes,
          food_status: updatedFood.food_status,
        },
      };
      const result = await foodsCollection.updateOne(query, update);
      res.send(result);
    });

    // Delete food
    app.delete("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.deleteOne(query);
      res.send(result);
    });

   
// ----------Request system apis----------

    // create food request
    app.post("/requests", async (req, res) => {
      const requestData = req.body;
      requestData.status = "pending";
      const result = await requestsCollection.insertOne(requestData);
      res.send(result);
    });

    // get all request for a specific food (for food Owner)
    app.get("/requests/:foodId", async (req, res) => {
      const foodId = req.params.foodId;
      const result = await requestsCollection
        .find({ foodId: foodId })
        .toArray();
      res.send(result);
    });

    //3. Get all requests for a specific user (for my requests page)
    app.get("/my-requests/:email", async (req, res) => {
      const email = req.params.email;
      const result = await requestsCollection
        .find({ requesterEmail: email })
        .toArray();
      res.send(result);
    });

    //4. Accept a request (food owner action)
    app.patch("/requests/accept/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const request = await requestsCollection.findOne(query);
      const update = {
        $set: { status: "accepted" },
      };
      const updateRequest = await requestsCollection.updateOne(query, update);

      const foodId = { _id: new ObjectId(request.foodId) };
      const foodUpdate = {
        $set: { food_status: "Donated" },
      };
      const updateFood = await foodsCollection.updateOne(foodId, foodUpdate);

      res.send({ updateRequest, updateFood });
    });

    //5. Reject a request (food owner action)
    app.patch("/requests/reject/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: { status: "rejected" },
      };
      const result = await requestsCollection.updateOne(query, update);
      res.send(result);
    });

    // 6. Cancel a request (delete)
    app.delete("/requests/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await requestsCollection.deleteOne(query);
      res.send(result);
    });


    // --------users related apis--------

    // create user
    app.post("/users", async (req, res) => {
      const newUser = req.body;

      const email = req.body.email;
      const query = { email: email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        res.send({ message: "user already exist" });
      } else {
        const result = await usersCollection.insertOne(newUser);
        res.send(result);
      }
    });

    // get all user
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // get single user by email
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email });
      res.send(result);
    });

    // delete user
    app.delete("/users/:email", async (req, res) => {
      const query = { email: req.params.email };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`plateShare server is running on port: ${port}`);
});
