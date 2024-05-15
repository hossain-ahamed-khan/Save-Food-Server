const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
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
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.r0xwjyk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// middlewares 

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded;
        next();
    })
}


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

        app.get('/food/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await foodCollection.findOne(query)
            res.send(result);
        })

        app.post('/add-food', verifyToken, async (req, res) => {
            const newFood = req.body;
            const result = await foodCollection.insertOne(newFood);
            res.send(result);
        })

        app.get('/my-foods/:email', verifyToken, async (req, res) => {
            if (req.user.email !== req.params.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const result = await foodCollection.find({ donator_email: req.params.email }).toArray();
            res.send(result);
        })

        app.get('/requested-foods/:email', verifyToken, async (req, res) => {
            if (req.user.email !== req.params.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const cursor = requestedFoodCollection.find({ user_email: req.params.email });
            const result = await cursor.toArray();
            res.send(result);
        })

        app.post('/request-food', verifyToken, async (req, res) => {
            const requestFood = req.body;
            const result = await requestedFoodCollection.insertOne(requestFood);
            res.send(result);
        })

        app.put('/update-food/:id', verifyToken, async (req, res) => {
            const query = { _id: new ObjectId(req.params.id) };
            const data = {
                $set: {
                    food_name: req.body.food_name,
                    food_img: req.body.food_img,
                    donator_name: req.body.donator_name,
                    donator_img: req.body.donator_img,
                    food_quantity: req.body.food_quantity,
                    pickup_location: req.body.pickup_location,
                    expire_date: req.body.expire_date,
                    additional_notes: req.body.additional_notes,
                    donator_email: req.body.donator_email,
                    food_status: req.body.food_status,
                }
            }
            const result = await foodCollection.updateOne(query, data);
            res.send(result);
        })

        app.delete("/delete-food/:id", verifyToken, async (req, res) => {
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