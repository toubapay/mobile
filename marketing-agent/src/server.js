const express = require('express');
const cors = require('cors');
const config = require('./config');
const campaignsRouter = require('./routes/campaigns');
const { FLYERS_DIR } = require('./lib/flyer');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/flyers', express.static(FLYERS_DIR));
app.use('/api/campaigns', campaignsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`Marketing agent listening on http://localhost:${config.port}`);
});
