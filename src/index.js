const express = require('express');
require('./db/mongoose');
const userRouters = require('./routers/users');
const taskRouters = require('./routers/tasks');

const app = express();

const port = process.env.PORT;

app.use(express.json());
app.use(userRouters);
app.use(taskRouters);

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});