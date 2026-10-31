// ============================================================================
// RELIEFLINK 360 - MongoDB 7.0 Document Intelligence Initializer
// Role: Flexible, schema-less incident intelligence, drone imagery metadata,
//       unstructured field telemetry, and raw SOS audio/transcript logs.
// STRICT INVARIANT (CO3 Polyglot Persistence): ZERO INVENTORY BALANCES OR TRANSACTION LEDGERS HERE.
// ============================================================================

db = db.getSiblingDB('relieflink_intelligence');

// 1. Unstructured Incident Intelligence Collection
db.createCollection('incident_intelligence');
db.incident_intelligence.createIndex({ incident_id: 1 }, { unique: true });
db.incident_intelligence.createIndex({ captured_at: -1 });
db.incident_intelligence.createIndex({ detected_hazards: 1 });

// 2. Drone Telemetry & Aerial Reconnaissance Collection (Geospatial 2dsphere)
db.createCollection('drone_telemetry');
db.drone_telemetry.createIndex({ flight_id: 1 });
db.drone_telemetry.createIndex({ location: '2dsphere' });
db.drone_telemetry.createIndex({ timestamp: -1 });

// 3. Responder Field Observation Audio & Photo Metadata
db.createCollection('field_observations');
db.field_observations.createIndex({ responder_id: 1, logged_at: -1 });
db.field_observations.createIndex({ incident_id: 1 });
db.field_observations.createIndex({ location: '2dsphere' });

// 4. Incident Situation Reports (SitReps & Weather Gauges)
db.createCollection('situation_reports');
db.situation_reports.createIndex({ report_id: 1 }, { unique: true });
db.situation_reports.createIndex({ incident_id: 1 });
db.situation_reports.createIndex({ impact_zone: '2dsphere' });
db.situation_reports.createIndex({ reported_at: -1 });

// ----------------------------------------------------------------------------
// SEED DEMO INTELLIGENCE DOCUMENTS
// ----------------------------------------------------------------------------

// Clear existing demo records to ensure fresh idempotent seed
db.incident_intelligence.deleteMany({});
db.drone_telemetry.deleteMany({});
db.field_observations.deleteMany({});
db.situation_reports.deleteMany({});

// 1. Seed Incident Intelligence
db.incident_intelligence.insertMany([
  {
    incident_id: 'INC-2026-0001',
    drone_recon_summary: 'Thermal imaging detected 6 heat signatures in upper floor rooms. Flood water depth estimated at 1.8 meters with moderate current.',
    raw_audio_transcript: 'Water is rushing in through the basement parking. The transformer exploded. We have an elderly patient on continuous positive airway pressure who is running on emergency battery.',
    detected_hazards: ['FLOATING_DEBRIS', 'HIGH_VOLTAGE_TRANSFORMER_SUBMERGED', 'WATER_CURRENTS'],
    weather_telemetry: {
      precipitation_mm_hr: 45.2,
      wind_gust_kmh: 62.0,
      river_gauge_level_meters: 8.4
    },
    urgency_indicators: {
      power_outage: true,
      medical_device_critical: true,
      submerged_escape_route: true
    },
    captured_at: new Date('2026-10-30T16:00:00Z')
  },
  {
    incident_id: 'INC-2026-0002',
    drone_recon_summary: 'Community hall roof intact. Dry ground surrounding facility, but perimeter roads flooded up to 0.6 meters. Large group of displaced residents assembled outside.',
    raw_audio_transcript: 'We have 45 people here including 12 senior citizens. Drinking water cans ran out 2 hours ago. We need potable water and biscuits or dry rations immediately.',
    detected_hazards: ['DRINKING_WATER_CONTAMINATION', 'OVERCROWDING_RISK'],
    weather_telemetry: {
      precipitation_mm_hr: 22.0,
      wind_gust_kmh: 38.0,
      river_gauge_level_meters: 5.1
    },
    captured_at: new Date('2026-10-30T16:30:00Z')
  },
  {
    incident_id: 'INC-2026-0003',
    drone_recon_summary: 'Approach road via Inner Ring Road is partially blocked by a fallen banyan tree. 4x4 vehicles can navigate via adjacent service lane.',
    raw_audio_transcript: 'School ground has 3 feet of water. 25 children and teachers moved to the first floor auditorium. Water supply pipe damaged. We received 10 water cans but need 10 more and food packs.',
    detected_hazards: ['FALLEN_TREE_OBSTRUCTION', 'CONTAMINATED_LOCAL_WATER_LINE'],
    weather_telemetry: {
      precipitation_mm_hr: 38.5,
      wind_gust_kmh: 44.0,
      river_gauge_level_meters: 7.2
    },
    captured_at: new Date('2026-10-30T17:00:00Z')
  },
  {
    incident_id: 'INC-2026-0005',
    drone_recon_summary: 'High coastal surf breaching retaining embankment. Saltwater inundation in residential alleys. Local health sub-centre flooded.',
    raw_audio_transcript: 'Coastal storm surge breached the canal. We have 3 insulin-dependent diabetic residents whose medications spoiled due to power failure, and an elderly COPD patient struggling to breathe without oxygen.',
    detected_hazards: ['SALT_WATER_SURGE', 'POWER_GRID_FAILURE', 'HYPOTHERMIA_RISK'],
    weather_telemetry: {
      precipitation_mm_hr: 52.0,
      wind_gust_kmh: 75.0,
      tide_surge_meters: 2.1
    },
    captured_at: new Date('2026-10-30T17:15:00Z')
  }
]);

// 2. Seed Drone Telemetry (with GeoJSON Point coordinates [longitude, latitude])
db.drone_telemetry.insertMany([
  {
    flight_id: 'DRONE-RECON-ALPHA',
    incident_id: 'INC-2026-0001',
    drone_model: 'Matrice 300 RTK',
    battery_level_percent: 68,
    altitude_agl_meters: 42.5,
    speed_mps: 4.2,
    location: {
      type: 'Point',
      coordinates: [80.2100, 13.0850]
    },
    sensor_payload: {
      thermal_camera: 'FLIR Vue Pro R',
      optical_zoom: '20x',
      submerged_depth_marker_pixels: 312
    },
    timestamp: new Date('2026-10-30T16:05:00Z')
  },
  {
    flight_id: 'DRONE-RECON-BETA',
    incident_id: 'INC-2026-0003',
    drone_model: 'DJI Mavic 3 Enterprise',
    battery_level_percent: 84,
    altitude_agl_meters: 35.0,
    speed_mps: 3.1,
    location: {
      type: 'Point',
      coordinates: [80.2180, 12.9800]
    },
    sensor_payload: {
      thermal_camera: '640x512 Radiometric',
      optical_zoom: '56x',
      obstruction_width_meters: 4.8
    },
    timestamp: new Date('2026-10-30T17:02:00Z')
  }
]);

// 3. Seed Field Observations (Responder Logs)
db.field_observations.insertMany([
  {
    responder_id: '33333333-3333-3333-3333-333333333333',
    incident_id: 'INC-2026-0003',
    observation_type: 'DELIVERY_CHECKPOINT',
    notes: 'Arrived at St. Jude Primary School via northern service lane. Delivered first relief batch (10 water cans, 12 ration packs). Verified school headmaster Joseph Anthony on site. Remaining supplies scheduled for batch 2.',
    location: {
      type: 'Point',
      coordinates: [80.2180, 12.9800]
    },
    attached_media: [
      {
        type: 'PHOTO',
        file_name: 'st_jude_delivery_batch1.webp',
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        caption: 'Batch 1 handover to school headmaster'
      }
    ],
    logged_at: new Date('2026-10-30T17:10:00Z')
  }
]);

// 4. Seed Situation Reports (SitReps)
db.situation_reports.insertMany([
  {
    report_id: 'SITREP-2026-1030-01',
    incident_id: 'INC-2026-0001',
    author: 'Incident Commander Elena Rostova',
    overall_status: 'CRITICAL',
    title: 'Anna Nagar West Flooding & Electrical Hazard Cluster',
    executive_summary: 'Severe ground floor inundation trapping 18 people including vulnerable cardiac patients and infants. High water currents prevent standard sedan evacuation. Boat team dispatch required.',
    impact_zone: {
      type: 'Point',
      coordinates: [80.2100, 13.0850]
    },
    weather_condition: 'HEAVY_MONSOON_DOWNPOUR',
    evacuation_routes: [
      { route_name: '2nd Avenue North', status: 'PASSABLE_4X4_ONLY' },
      { route_name: 'River Road South', status: 'IMPASSABLE_SUBMERGED' }
    ],
    reported_at: new Date('2026-10-30T16:15:00Z')
  }
]);

print('MongoDB relieflink_intelligence initialized successfully with 4 collections, 2dsphere indexes, and realistic emergency telemetry.');
