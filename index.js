const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://save-food-ba204.web.app',
        'https://save-food-ba204.firebaseapp.com',
    ],
    credentials: true
}));
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.r0xwjyk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const foodCollection = client.db('saveFoodDB').collection('foods');
        const requestedFoodCollection = client.db('saveFoodDB').collection('requestedFoods');

        // auth related api 
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

            res
                .cookie('token', token, cookieOptions)
                .send({ success: true })
        })

        app.post('/logout', async (req, res) => {
            const user = req.body;

            res
                .clearCookie('token', { ...cookieOptions, maxAge: 0 })
                .send({ success: true })
        })

        // food related api 

        app.get('/foods', async (req, res) => {
            const cursor = foodCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/food/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = { _id: new ObjectId(id) };
            const result = await foodCollection.findOne(query)
            console.log(result)
            res.send(result);
        })

        app.post('/add-food', async (req, res) => {
            const newFood = req.body;
            const result = await foodCollection.insertOne(newFood);
            res.send(result);
        })

        app.get("/my-foods/:email", async (req, res) => {
            console.log(req.params.email);
            const result = await foodCollection.find({ donator_email: req.params.email }).toArray();
            res.send(result);
        })

        app.get('/requested-foods', async (req, res) => {
            const cursor = requestedFoodCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.post('/request-food', async (req, res) => {
            const requestFood = req.body;
            const result = await requestedFoodCollection.insertOne(requestFood);
            res.send(result);
        })

        app.delete("/delete-food/:id", async (req, res) => {
            const result = await foodCollection.deleteOne({ _id: new ObjectId(req.params.id) })
            res.send(result);
        })

        app.delete('/delete-food/:id', async (req, res) => {
            const result = await foodCollection.deleteOne({ _id: new ObjectId(req.params.id) })
            res.send(result);
        })



        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('save food server is running')
})

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})