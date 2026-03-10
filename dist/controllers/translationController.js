"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedTranslations = exports.getTranslations = void 0;
const data_source_1 = require("../data-source");
const Translation_1 = require("../models/Translation");
const translationService_1 = require("../services/translationService");
const ENGLISH_DICTIONARY = {
    welcome: "MoveX", tagline: "Global Logistics Redefined", pickup: "Pickup Point", destination: "Drop-off Point",
    create_order: "Create Shipment", tracking: "Live Tracking", settings: "Settings", profile: "Profile",
    revenue: "Gross Revenue", payouts: "Driver Payouts", orders: "Orders", drivers: "Drivers", finances: "Finances",
    logout: "Log out", pay_now: "Pay Secured",
    grocery: "Grocery", dispatch: "AI Dispatch", executive_dashboard: "Executive Dashboard", menu: "Menu", user_logic: "User Logic",
    operational_status: "Operational status and financial analytics overview.", export: "Export Data",
    refresh: "Refresh Feed", revenue_analytics: "Revenue Analytics", daily_performance: "Daily performance.",
    service_mix: "Service Mix", volume_by_category: "Volume by category.", network_radar: "Network Radar",
    live_telemetry: "Live telemetry.", live_tracking_active: "Live Tracking Active", total_saturation: "Total Saturation",
    delivered_today: "Delivered Today", overview: "Dashboard", analytics: "Analytics", shipment: "Shipment",
    save: "Save Changes", edit_profile: "Edit Profile", live: "Live", target: "Target", last_month: "Last Month",
    PENDING: "Pending", ACCEPTED: "Accepted", PICKED_UP: "Picked Up", DELIVERED: "Delivered", CANCELLED: "Cancelled",
    Document: "Document", Electronics: "Electronics", Clothing: "Clothing", Economy: "Economy", Standard: "Standard", Premium: "Premium",
    Mon: "Mon", Tue: "Tue", Wed: "Wed", Thu: "Thu", Fri: "Fri", Sat: "Sat", Sun: "Sun",
    Food: "Food", Parcel: "Parcel", Pharmacy: "Pharmacy",
    search_placeholder: "Where to go?", order_hub: "Order Hub", frequent_nodes: "Frequent Nodes",
    service_modules: "Deployment Modules", mission_updates: "Mission Updates", archives: "Archives",
    no_active_orders: "No Active Deployment", start_session: "Initialize your first session",
    network_capabilities: "Network Capabilities", relay_pro: "Relay Pro", relay_pro_desc: "Enterprise-level logistics matrix",
    rapid_flux: "Rapid Flux", rapid_flux_desc: "Under 15 min ultra-priority",
    user_node: "User Node", node_active: "NODE ACTIVE", core_protocols: "Core Protocols",
    linguistic_spectrum: "Linguistic Spectrum", terminate_session: "Terminate Session",
    personal_identity: "Personal Identity", comm_link: "Comm Link", finance_methods: "Finance Methods",
    security_vault: "Security Vault", alert_feed: "Alert Feed",
    mission_operations: "Mission Operations", track_deploy_stream: "Track and deploy your localized delivery stream.",
    new_deployment: "New Deployment", active_flux: "Active Flux", pending_packets: "Pending Pkts",
    total_volume: "Total Volume", operational_streams: "Operational Streams", running: "Running",
    no_active_telemetry: "No active telemetry detected.", create_first_deployment: "Create First Deployment",
    successful_consignments: "Successful Consignments", consignment_id: "Consignment ID",
    operation_metadata: "Operation Metadata", protocol_state: "Protocol State", mission_deployment: "Mission Deployment",
    deploy_delivery_request: "Deploy a new delivery request into the MoveX ecosystem.",
    inception_point: "Inception Point", target_point: "Target Point", radar_pick: "Radar Pick",
    deployment_tier: "Deployment Tier", payload_weight: "Payload Weight", authorize_deployment: "Authorize Deployment",
    route_telemetry_map: "Route Telemetry Map", selecting: "Selecting", initializing_terminal: "Initializing Terminal...",
    active_duty: "Active Duty", since: "Since", units: "Units",
    kyc_hub: "KYC Verification Hub", review_credentials: "Review and validate incoming driver credential nodes.",
    pending_ingestion: "Pending Ingestion", incoming_requests: "Incoming Requests", neural_backlog_clear: "Neural backlog clear",
    review: "REVIEW", selection_required: "Operational Selection Required", selection_desc: "Select a driver application from the left pane to begin tactical identity verification.",
    download_dossier: "Download Dossier", technical_specs: "Technical Specs", fleet_category: "Fleet Category",
    protocol_handle: "Protocol Handle", vehicle_id: "Vehicle Identification", unregistered_unit: "Unregistered Unit",
    plate_pending: "Plate: [PENDING_UPLOAD]", document_nodes: "Document Nodes", bio_id: "National Bio-ID",
    license: "Fleet Mastery License", integrity: "Vehicle Hull Integrity", verified: "VERIFIED",
    pending_review: "PENDING_REVIEW", unavailable: "UNAVAILABLE", safety_warning: "Tactical Safety Warning",
    safety_desc: "Approving this node will grant immediate access to active mission vectors and financial protocols. Ensure all physical dossier checks are verified.",
    authorize_node: "Authorize Node",
    fleet_ops: "Fleet Operations", manage_fleet_desc: "Manage driver status, applications and live tracking.",
    active_fleet: "Active Fleet", pending_apps: "Pending", onboard_driver: "Onboard Driver",
    units_online: "Units Online", active_missions: "Active Missions", standby_units: "Standby Units",
    total_fleet: "Total Fleet", tracking_radar: "Fleet Tracking Radar", telemetry_desc: "Live location telemetry of online nodes.",
    live_sync: "Live Sync", driver_directory: "Driver Directory", search_drivers: "Search drivers...",
    no_vehicle: "No Vehicle", view_stats: "View Stats", no_pending_apps: "No Pending Applications",
    backlog_processed: "All incoming requests have been processed.", app_pending: "Application Pending",
    not_specified: "Not specified", approve: "Approve", reject: "Reject", manual_induction: "Manual Node Induction",
    register_node_desc: "Register a driver node directly into the fleet hub.", full_name: "Full Name",
    phone_number: "Phone Number", vehicle_type: "Vehicle Type/Model", finalize_reg: "Finalize Registration",
    finance_intel: "Financial Intelligence", audit_trails_desc: "Real-time audit trails and capital distribution metrics.",
    export_csv: "Export Audit CSV", fiscal_reports: "Fiscal Reports", gross_revenue: "Gross Revenue",
    fleet_payouts: "Fleet Payouts", net_profit: "Net Profit", tax_reserves: "Tax Reserves",
    revenue_trajectory: "Revenue Stream Trajectory", inflow_tracking: "Multi-dimensional operational inflow tracking.",
    allocation_matrix: "Capital Allocation Matrix", fiscal_desc: "Fiscal distribution across the ecosystem.",
    audit_ledger: "Audit Ledger Feed", blockchain_nodes: "Blockchain-verified transaction nodes.",
    full_statement: "Full Statement", settlement_node: "Logistics Settlement Node", synchronized: "SYNCHRONIZED",
    platform_fee: "Platform Fee", driver_payouts: "Driver Payouts",
    business_partners: "Business Partners", b2b_desc: "Manage B2B service providers and enterprise integrations.",
    connect_partner: "Connect New Partner", global_traffic: "Global Traffic", network_revenue: "Network Revenue",
    total_sync_nodes: "Total Sync Nodes", culinary_units: "Culinary Units", medical_nodes: "Medical Nodes",
    retail_streams: "Retail Streams", active_partners: "Active Partners", no_active_partners: "No Active Partners",
    view_analytics: "View Category Analytics", partner_induction: "Enterprise Node Induction",
    b2b_protocol_desc: "Initiate B2B partnership protocol to the network.", business_name: "Business Name",
    official_email: "Official Email", authorize_partnership: "Authorize Partnership", nodes: "Nodes",
    // Infrastructure & System
    infra_hud: "Infrastructure HUD", nodal_load_desc: "Real-time nodal load balancing and system guard protocol.",
    global_guard: "Global Guard", engaged: "ENGAGED", operational: "OPERATIONAL",
    deactivate_guard: "Deactivate Guard", engage_lockdown: "Engage Lockdown",
    load_balancer: "Auto-Scale Load Balancer", strategy: "Strategy", nodal_load: "Nodal Load",
    global_throughput: "Global Throughput", active_conns: "Active Conns",
    security_protocol: "Security Protocol", ssl_termination: "SSL Termination",
    waf_filtering: "WAF Filtering", ddos_mitigation: "DDoS Mitigation",
    emergency_protocol: "Emergency Protocol", emergency_desc: "Engaging the Global Guard will immediately suspend all client mission activities while maintaining administrative node access. Use only during catastrophic infrastructure anomalies or scheduled recalibration.",
    open_health_hud: "Open Neural Health HUD",
    // Reports & Data
    reports_hub: "Advanced Reporting Hub", data_protocol: "CROSS-SERVICE DATA EXTRACTION PROTOCOL v1.0",
    archived_events: "Total Archived Events", last_sync: "Last Sync", live_sync_active: "Live Syncing Active",
    fiscal_audit_ledger: "Fiscal Audit Ledger", fiscal_audit_desc: "Complete financial inflows, tax reserves, and nodal payouts.",
    global_mission_log: "Global Mission Log", mission_log_desc: "Historical order data, route telemetry, and delivery benchmarks.",
    fleet_dossier: "Fleet Performance Dossier", fleet_dossier_desc: "Driver ratings, mission success rates, and active node stats.",
    ai_telemetry_title: "AI Heuristic Telemetry", ai_telemetry_desc: "Dispatcher scoring logs and auto-assignment recalibration data.",
    generate_extract: "Generate Extract", config_webhook: "Configure Webhook",
    webhook_desc: "Enter your endpoint URL to receive real-time data push events.",
    save_webhook: "Save Webhook", setup_webhook: "Setup Webhook",
    auto_data_streams: "Automated Data Streams",
    data_streams_desc: "Configure scheduled S3 uploads or Webhook callbacks for external ERP synchronization. Maintain absolute data sovereignty with end-to-end encryption.",
    read_protocol: "Read Protocol",
    // Profile & Settings
    change_photo: "Change Photo", account_level: "Account Level", node: "NODE",
    payment_methods: "Payment Methods", wallet_desc: "Manage your connected wallets and cards.",
    configure_wallet: "Configure Wallet", security_terminal: "Security Terminal",
    security_desc: "2FA and session authentication logs.", access_vault: "Access Vault",
    system_protocols: "System Protocols", settings_desc: "Fine-tune your experience and automation preferences.",
    notifications: "Notifications", notif_desc: "Stay updated with real-time alerts.",
    email_comms: "Email Communications", email_desc: "Dispatch & Monthly Reports",
    direct_sms: "Direct SMS Feed", sms_desc: "Critical status broadcasts",
    operations: "Operations", ops_desc: "Configure core system behavior.",
    live_global_sync: "Live Global Sync", sync_desc: "Real-time telemetry visibility",
    ai_dispatching: "AI-driven fleet dispatching",
    // Driver Operations
    driver_control: "Driver Control", global_fleet_sync: "Global Fleet Sync",
    todays_wallet: "Today's Wallet", trips_total: "trips total", withdraw: "Withdraw",
    available_flux: "Available Flux", new_jobs: "New", scanning_spectrum: "Scanning localized spectrum...",
    mins_away: "mins away", accept: "Accept",
    mission_alignment: "Mission Alignment", to_target: "to Target",
    current_fleet_post: "Current Fleet Post", mission_terminal: "Mission Terminal",
    target_client: "Target Client", consignment_loaded: "Consignment Loaded",
    report_pickup: "Report Pickup", finalize_delivery: "Finalize Delivery",
    spectral_surveillance: "Spectral Surveillance", no_active_missions: "No active missions assigned to your node. Monitoring the spectrum for local fulfillment requests.",
    total_trips: "Total Trips", total_earned: "Total Earned",
    // Partner Portal
    partner_command: "Partner Command", global_node_sync: "Global Node Primary Sync",
    merchant_revenue: "Merchant Revenue",
    service_slf: "Service SLf", mission_ledger: "Mission Ledger",
    mission_ledger_desc: "Live telemetry for local node shipments.", search_id: "Search ID...",
    no_active_flux: "Zero Active Flux Processed.", profit_flux: "Profit Flux",
    pending_payout: "Pending Payout", node_state: "Node State", alert_sync: "Alert Sync",
    terminate_node: "Terminate Node",
    // Maintenance & Recalibration
    system_under_recalibration: "System Under Recalibration",
    global_operational_guard: "Global Operational Guard Engaged",
    nodal_syncing: "Nodal Syncing", db_reindexing: "Db Re-indexing",
    logic_patching: "Logic Patching", admin_nodes_authenticated: "Admin Nodes: Authenticated",
    optimizing_mission_vectors: "Optimizing Mission Vectors",
    // Driver Tactical Command
    commander_hub: "Commander Hub", syncing: "SYNCING...", revenue_matrix: "Revenue Matrix",
    spectrum_normal: "Real-time Spectrum Normal", mission_pool: "Mission Pool",
    rescan_pool: "Rescan Pool", calculated_flux: "Calculated Flux", mins: "MIN",
    scanning_unclaimed: "Scanning spectrum for unclaimed missions...",
    online_protocol: "Online Protocol Active", offline_state: "Offline State",
    handshaking: "Handshaking...", handshaking_desc: "Synchronizing nodes...",
    mission_profile: "Mission Profile", initialize_mission: "Initialize Mission?",
    commit_node_desc: "Commit node to this delivery protocol. Telemetry will be broadcast.",
    wait: "Wait", deploy: "Deploy", protocol_active: "Protocol Active 🛰️",
    mission_initialized: "Mission initialized. Routing synced.", mission_spectrum_error: "Mission spectrum shifted or unavailable.",
    objective_secured: "Objective Secured 🏆", verification_success: "Verification success. Revenue synced.",
    network_instability: "Network Instability", sync_mission_error: "Could not sync mission state.",
    comm_error: "Comm Error", transmit_failed: "Failed to transmit message packet.",
    mission_node: "Node #", inception_node: "Inception Node", target_terminal: "Target Terminal",
    requesting_client: "Requesting Client", synced_node: "SYNCED NODE", payload_characteristics: "Payload Characteristics",
    payload_class: "Class", weight_normal: "Weight Normal • Secure Packaging",
    tactical_radar: "Tactical Radar", live_routing_desc: "Live routing to node target",
    terminal_delivery_protocol: "Terminal Delivery Protocol", capture_evidence: "Capture Consignment Evidence",
    auth_otp: "Authorization OTP", confirm_release: "Confirm Release", aquire_payload: "Aquire Payload",
    secure_link_active: "Secure Link Active", no_packets_found: "No encrypted packets found.",
    type_message: "Type a message...",
    solutions: "Solutions", company: "Company", safety: "Safety", developers: "Developers",
    sign_in: "Sign In", live_demo: "Live Demo", v2_core_active: "V2.0 Core Infrastructure Active",
    hero_title: "Logistics at Light Speed.", hero_desc: "Building the world's most advanced delivery network. MoveX leverages AI-driven dispatch and real-time telemetry to power global commerce.",
    join_network: "Join the Network", driver_portal: "Driver Portal",
    uptime: "Uptime", cities: "Cities",
    live_flux: "Live Flux", efficiency: "Efficiency", growth: "Growth",
    mission_critical_security: "Mission Critical Security", mission_critical_desc: "Every node in the MoveX network is verified with enterprise-grade encryption and real-time auditing.",
    neural_dispatch: "Neural Dispatch Engine", neural_dispatch_desc: "Proprietary AI algorithms match payloads with the optimal fleet operator in under 100 milliseconds.",
    global_reach: "Global Reach, Local Depth", global_reach_desc: "A worldwide logistics infrastructure tailored for hyper-local operational excellence.",
    all_rights_reserved: "All rights reserved.", terms: "Terms", privacy: "Privacy", contact: "Contact", twitter: "Twitter",
    earnings_ledger: "Earnings Ledger", all_time_delivery_count: "All-time delivery count",
    recent_activity: "Recent Activity", no_transactions_yet: "No transactions yet",
    commander_profile: "Commander Profile", node_authorized: "Node Authorized",
    protocol_online: "Protocol: Online", protocol_idle: "Protocol: Idle",
    global_telemetry_active: "Global Telemetry Active", signal_suspended: "Signal Suspended",
    hardware_logistics: "Hardware & Logistics", designated_vehicle: "Designated Vehicle",
    unregistered_payload: "Unregistered Payload", network_status: "Network Status",
    operational_zone: "Operational Zone", global_spectrum: "Global Spectrum",
    disconnect_node_confirm: "Do you wish to disconnect your node from the network?",
    terminate_session_title: "Terminate Session", node_broadcasting_alert: "Your node is now broadcasting telemetry.",
    node_signal_terminated_alert: "Node signal terminated.", consensus_error: "Consensus Error",
    verified_delivery: "Verified Delivery", mission_aborted: "Mission Aborted",
    in_progress: "In Progress", awaiting_ack: "Awaiting Ack",
    mission_archive: "Mission Archive", search_historical_payloads: "Search historical payloads...",
    zero_frequency_logs: "Zero Frequency logs",
    no_previous_missions_desc: "No previous missions detected in the MoveX spectrum for this node.",
    encrypted_ledger: "Encrypted Ledger", entries: "Entries",
    universal: "Universal", logged: "LOGGED",
    mission_control: "Mission Control", sync_nodes_desc: "Synchronizing professional nodes with the MoveX delivery spectrum.",
    node_identification: "Node Identification", driver_id_phone: "Driver ID / Phone",
    synchronizing_btn: "SYNCHRONIZING...", authorize_access: "AUTHORIZE ACCESS",
    new_node: "New Node?", apply_to_join: "Apply to Join",
    secure_tunnel_active: "Secure Operational Tunnel Active",
    id_required_desc: "Identification required to access the network.",
    authorization_failed_desc: "Authorization failed. Ensure your node profile is active.",
    consensus_failure: "Consensus Failure",
    join_movex_fleet: "Join MoveX Fleet",
    certified_node_desc: "Become a certified node in our global logistics ecosystem.",
    biological_profile: "Biological Profile", legal_full_name: "Legal Full Name",
    comlink_number: "ComLink Number", vehicle_specifications: "Vehicle Specifications",
    model_year_placeholder: "Model & Year (e.g. Tesla Semi 2024)",
    license_serial_node: "License / Serial Node", security_clearances: "Security Clearances",
    verify_id_docs: "Verify ID Documents", docs_synchronized: "Docs Synchronized",
    finish_onboarding: "Finish Onboarding", already_node_member: "Already a node member?",
    back_to_hub: "Back to hub", verification_incomplete_desc: "Verification incomplete. Core telemetry required.",
    compliance_error: "Compliance Error", id_verification_required_desc: "Identification verification protocol required to join the network.",
    application_buffered: "Application Buffered ✅", handshake_success_desc: "Handshake successful, {{name}}. Our security team will review your node profile ({{license}}) within 48 standard hours.",
    acknowledge: "Acknowledge", application_rejected_desc: "Application rejected. Duplicate node detected or network latency.",
    verification_protocol_title: "Verification Protocol", encrypted_doc_scan_desc: "Initiating encrypted document scan for Identity and Licensure.",
    mock_scan: "Mock Scan", spectrum_cleared_title: "Spectrum Cleared ✅", vault_storage_desc: "ID/Permit encrypted and stored in decentralized vault.",
    identity_synchronized_alert: "Your identity has been synchronized.",
    sync_failure_desc: "Sync failure detected. Check network protocols.",
    terminate_session_confirm_title: "Terminate Session? 👋",
    terminate_session_confirm_desc: "This will disconnect your node from the MoveX network.",
    stay_connected: "Stay Connected", disconnect: "Disconnect",
    clean_termination_failed: "Clean termination failed",
    mission_brief: "Mission Brief", neural_route_preview: "Neural Route Preview",
    optimized_path_calculated: "Optimized Transit Path Calculated",
    protocol_routing: "Protocol Routing", start_point: "Start Point",
    destination_placeholder: "Destination",
    deployment_tiers: "Deployment Tiers", protocol_notes: "Protocol Notes (Optional)",
    mission_details_placeholder: "Mission details, gate codes, contact telemetry...",
    total_authorized_quote: "Total Authorized Quote", locked_rate: "Locked Rate",
    deployment_active: "Deployment Active! 🚀",
    mission_initialized_desc: "Your mission has been initialized. Tracking driver node now.",
    finalize_hub: "Finalize Hub", sync_payment: "Sync Payment",
    incomplete_protocol: "Incomplete Protocol",
    define_terminals_desc: "Please define pickup and target terminal.",
    economy: "Economy", comfort: "Comfort", business: "Business",
    delivered_status: "Delivered", cancelled_status: "Cancelled",
    accepted_status: "Accepted", picked_up_status: "Picked Up",
    pending_status: "Pending", abort_denied: "Abort Denied",
    protocol_state_desc: "Protocol state is already {{status}}.",
    abort_protocol_title: "Abort Protocol",
    terminate_mission_confirm_desc: "Permanently terminate mission {{id}}?",
    terminate_btn: "Terminate", wait_btn: "Wait",
    shipment_label: "Shipment", mission_archives: "Mission Archives",
    protocol_history_empty: "Protocol history empty",
    protocol_fulfilled: "Protocol Fulfilled!", feedback_telemetry_desc: "How was your interaction with {{agent}}?",
    consensus_verified_alert: "Consensus Verified! 🌟", feedback_logged_desc: "Your telemetry feedback has been logged into the MoveX ecosystem.",
    release_protocol_otp: "Release Protocol OTP", active_agent: "Active Agent",
    agent_synchronizing: "Agent Synchronizing...", abort_delivery_mission: "Abort Delivery Mission",
    target_reached_verified: "Target reached & verified",
    agent_moving_desc: "Agent is moving towards destination",
    finalize_feedback: "Finalize Feedback",
    select_star_desc: "Please select at least 1 star.",
    feedback_transmit_fail: "Failed to transmit feedback packet.",
    message_transmit_fail: "Failed to transmit message packet.",
    abort_mission: "Abort Mission", terminate_deployment_confirm: "Are you sure you want to terminate this active deployment?",
    protocol_terminated: "Protocol Terminated", deployment_retracted_desc: "Deployment successfully retracted.",
    deep_space_transport_desc: "Deep Space Transport Systems",
    target_pickup_node: "Target: Pickup Node", target_dropoff_node: "Target: Drop-off Node",
    estimated_t_arrival: "Estimated T-Arrival", launch_gps: "Launch GPS",
    location_telemetry_required_desc: "Location telemetry access required for navigation.",
    movex_network: "MoveX Network", secure_protocols_desc: "Secure delivery protocols for the modern ecosystem. Enter your comm link to begin.",
    handshake_failed: "Network handshake failed.",
    comm_node_phone: "Communication Node (Phone)", authorize: "Authorize",
    enc_enabled: "End-to-End Encryption Enabled",
    agreements_footer: "By authorizing, you agree to our Service Protocols and Privacy Framework.",
    work_node: "Work Node", home_terminal: "Home Terminal", gym_sector: "Gym Sector",
    cyber_city: "Cyber City, Phase 3", skyline_apts: "Skyline Apartments", power_fitness: "Power Fitness Hub",
    not_provided: "Not provided", active_driver: "Active Driver", consignee: "Consignee",
    global_search: "Global Telemetry Search...", live_alerts: "Live Alerts",
    no_alerts: "No active alerts", view_all_orders: "View All Orders",
    loading: "Loading", processing: "Processing...", error: "System Error", success: "Operation Successful",
    confirm_approve: "Approve Application for", confirm_reject: "Reject Application for",
    active: "active", inactive: "inactive", busy: "busy", available: "available",
    minutes: "minutes", ago: "ago", order_placed: "Order Placed", guest_user: "Guest User", locating: "Locating...",
    abort_mission_confirm: "Are you sure you want to abort mission"
};
const getTranslations = async (req, res) => {
    try {
        const lang = req.params.lang;
        const translationRepository = data_source_1.AppDataSource.getRepository(Translation_1.Translation);
        let data = await translationRepository.find({ where: { lang } });
        if (data.length === 0 && lang !== 'en') {
            console.log(`[MoveX] No translations for ${lang}. Generating dynamic bundle...`);
            const keys = Object.keys(ENGLISH_DICTIONARY);
            const translations = await Promise.all(keys.map(key => translationService_1.TranslationService.translate(ENGLISH_DICTIONARY[key], lang)));
            const translatedBundle = {};
            const savePromises = [];
            keys.forEach((key, index) => {
                const value = translations[index];
                translatedBundle[key] = value;
                savePromises.push(translationRepository.save(translationRepository.create({ lang, key, value })));
            });
            Promise.all(savePromises).catch(e => console.error("Cache save error:", e.message));
            return res.status(200).json(translatedBundle);
        }
        if (lang === 'en' && data.length === 0) {
            return res.status(200).json(ENGLISH_DICTIONARY);
        }
        const bundle = {};
        data.forEach(item => { bundle[item.key] = item.value; });
        const missingKeys = Object.keys(ENGLISH_DICTIONARY).filter(key => !bundle[key]);
        if (missingKeys.length > 0) {
            console.log(`[MoveX] ${lang} is missing ${missingKeys.length} keys. Syncing...`);
            const newTranslations = await Promise.all(missingKeys.map(key => lang === 'en' ? ENGLISH_DICTIONARY[key] : translationService_1.TranslationService.translate(ENGLISH_DICTIONARY[key], lang)));
            const savePromises = [];
            missingKeys.forEach((key, i) => {
                bundle[key] = newTranslations[i];
                savePromises.push(translationRepository.save(translationRepository.create({ lang, key, value: newTranslations[i] })));
            });
            Promise.all(savePromises).catch(console.error);
        }
        res.status(200).json(bundle);
    }
    catch (err) {
        console.error("Fetch translation error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getTranslations = getTranslations;
const seedTranslations = async (req, res) => {
    try {
        const translationRepository = data_source_1.AppDataSource.getRepository(Translation_1.Translation);
        await translationRepository.clear();
        const entries = Object.keys(ENGLISH_DICTIONARY).map(key => ({
            lang: 'en',
            key,
            value: ENGLISH_DICTIONARY[key]
        }));
        await translationRepository.insert(entries);
        res.status(201).json({ success: true, message: "Base English seeded. All other languages will generate dynamically!" });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.seedTranslations = seedTranslations;
//# sourceMappingURL=translationController.js.map