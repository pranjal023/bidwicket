const express = require('express');
const { rest } = require('../validation/schemas');
const { validate, asyncHandler } = require('../middleware/validate');
const rooms = require('../services/roomService');
const { buildResults } = require('../services/resultsService');
const { DEFAULT_SETTINGS } = require('../constants');

const router = express.Router();
const hostToken = (req) => req.get('x-host-token');
const teamToken = (req) => req.get('x-team-token');


router.post('/', validate(rest.createRoom), asyncHandler(async (req, res) => {
  const out = await rooms.createRoom(req.body.settings || {});
  res.status(201).json({ ok: true, ...out });
}));


router.get('/:code', validate(rest.roomParams, 'params'), asyncHandler(async (req, res) => {
  res.json({ ok: true, ...(await rooms.getPublicInfo(req.params.code)), defaults: DEFAULT_SETTINGS });
}));


router.post('/:code/teams/:teamId/claim', validate(rest.teamParams, 'params'), validate(rest.claimTeam),
  asyncHandler(async (req, res) => {
    res.status(201).json({ ok: true, ...(await rooms.claimTeam(req.params.code, req.params.teamId, req.body)) });
  }));


router.patch('/:code/teams/:teamId', validate(rest.teamParams, 'params'), validate(rest.updateTeam),
  asyncHandler(async (req, res) => {
    res.json(await rooms.updateTeam(req.params.code, req.params.teamId, req.body, { hostToken: hostToken(req), teamToken: teamToken(req) }));
  }));


router.patch('/:code/settings', validate(rest.roomParams, 'params'), validate(rest.updateSettings),
  asyncHandler(async (req, res) => {
    res.json({ ok: true, ...(await rooms.updateSettings(req.params.code, req.body, hostToken(req))) });
  }));


router.post('/:code/pool', validate(rest.roomParams, 'params'), validate(rest.uploadPool),
  asyncHandler(async (req, res) => {
    res.json({ ok: true, ...(await rooms.replacePool(req.params.code, req.body, hostToken(req))) });
  }));


router.get('/:code/results', validate(rest.roomParams, 'params'), asyncHandler(async (req, res) => {
  res.json({ ok: true, ...(await buildResults(req.params.code)) });
}));

module.exports = router;
