// models/CrowdsourcedReport.js
const mongoose = require('mongoose');

const crowdsourcedReportSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  route_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  report_type: { type: String, enum: ['Delay', 'Incident', 'Crowd'], required: true },
  status: { type: String, default: 'Pending' },
  description: { type: String, required: true },
  reported_at: { type: Date, default: Date.now },
});

const CrowdsourcedReportModel = mongoose.model('CrowdsourcedReport', crowdsourcedReportSchema);
module.exports = { CrowdsourcedReportModel };
