/**
 * PAFR Hierarchy Data
 * Matches org chart flow:
 *   Airbase (PAFR) → ARCEN → Group → Squadron (location-based)
 *
 * Replace with real API: GET /api/hierarchy
 */

export const hierarchyData = [
  {
    id: "airbase-pafr",
    name: "PAFR Airbase",
    code: "PAFR",
    region: "National",
    reservists: 2846,
    readiness: 78.4,
    arcens: [
      // ── 1st ARCEN ───────────────────────────────────────────
      {
        id: "arcen-1st",
        name: "1st ARCEN",
        fullName: "1st Air Reserve Center",
        code: "1ARCEN",
        commander: "Brig. Gen. Antonio Reyes",
        location: "Villamor Air Base, Pasay City",
        reservists: 842,
        groups: [
          {
            id: "group-101rw",
            name: "101st Reserve Wing",
            code: "101RW",
            type: "Combat Support",
            commander: "Col. Ricardo Santos",
            reservists: 420,
            squadrons: [
              { id: "sq-manila",      name: "Manila",       code: "MNL-SQ",  status: "active",   members: 108, specialization: "Security",        location: "Manila, NCR" },
              { id: "sq-qc",          name: "Quezon City",  code: "QC-SQ",   status: "active",   members: 96,  specialization: "Engineering",     location: "Quezon City, NCR" },
              { id: "sq-caloocan",    name: "Caloocan",     code: "CLN-SQ",  status: "active",   members: 88,  specialization: "Communications",  location: "Caloocan, NCR" },
              { id: "sq-pasay",       name: "Pasay",        code: "PSY-SQ",  status: "inactive", members: 72,  specialization: "Medical",         location: "Pasay, NCR" },
              { id: "sq-makati",      name: "Makati",       code: "MKT-SQ",  status: "active",   members: 56,  specialization: "Intelligence",    location: "Makati, NCR" },
            ],
          },
          {
            id: "group-102rw",
            name: "102nd Reserve Wing",
            code: "102RW",
            type: "Logistics",
            commander: "Col. Elena Flores",
            reservists: 422,
            squadrons: [
              { id: "sq-malabon",     name: "Malabon",      code: "MLB-SQ",  status: "active",   members: 92,  specialization: "Supply",          location: "Malabon, NCR" },
              { id: "sq-marikina",    name: "Marikina",     code: "MRK-SQ",  status: "active",   members: 88,  specialization: "Transport",       location: "Marikina, NCR" },
              { id: "sq-muntinlupa",  name: "Muntinlupa",   code: "MNP-SQ",  status: "inactive", members: 75,  specialization: "Maintenance",     location: "Muntinlupa, NCR" },
              { id: "sq-paranaque",   name: "Paranaque",    code: "PRQ-SQ",  status: "active",   members: 82,  specialization: "Administrative",  location: "Paranaque, NCR" },
              { id: "sq-taguig",      name: "Taguig",       code: "TGG-SQ",  status: "active",   members: 85,  specialization: "Cyber",           location: "Taguig, NCR" },
            ],
          },
        ],
      },

      // ── 2nd ARCEN ───────────────────────────────────────────
      {
        id: "arcen-2nd",
        name: "2nd ARCEN",
        fullName: "2nd Air Reserve Center",
        code: "2ARCEN",
        commander: "Brig. Gen. Maria Cruz",
        location: "Basa Air Base, Pampanga",
        reservists: 756,
        groups: [
          {
            id: "group-201rw",
            name: "201st Reserve Wing",
            code: "201RW",
            type: "Air Defense",
            commander: "Col. Jose Dela Cruz",
            reservists: 380,
            squadrons: [
              { id: "sq-pampanga",    name: "Pampanga",     code: "PMP-SQ",  status: "active",   members: 95,  specialization: "Air Defense",     location: "Angeles City, Pampanga" },
              { id: "sq-bulacan",     name: "Bulacan",      code: "BLC-SQ",  status: "active",   members: 90,  specialization: "Radar Ops",       location: "Malolos, Bulacan" },
              { id: "sq-bataan",      name: "Bataan",       code: "BTN-SQ",  status: "active",   members: 85,  specialization: "Security",        location: "Balanga, Bataan" },
              { id: "sq-zambales",    name: "Zambales",     code: "ZMB-SQ",  status: "inactive", members: 70,  specialization: "Engineering",     location: "Olongapo, Zambales" },
              { id: "sq-nueva-ecija", name: "Nueva Ecija",  code: "NEC-SQ",  status: "active",   members: 40,  specialization: "Communications",  location: "Cabanatuan, Nueva Ecija" },
            ],
          },
          {
            id: "group-202rw",
            name: "202nd Reserve Wing",
            code: "202RW",
            type: "Intelligence",
            commander: "Col. Carmen Lopez",
            reservists: 376,
            squadrons: [
              { id: "sq-tarlac",      name: "Tarlac",       code: "TRC-SQ",  status: "active",   members: 98,  specialization: "Intelligence",    location: "Tarlac City, Tarlac" },
              { id: "sq-pangasinan",  name: "Pangasinan",   code: "PGS-SQ",  status: "active",   members: 92,  specialization: "Surveillance",    location: "Dagupan, Pangasinan" },
              { id: "sq-la-union",    name: "La Union",     code: "LUN-SQ",  status: "active",   members: 88,  specialization: "Cyber",           location: "San Fernando, La Union" },
              { id: "sq-ilocos-n",    name: "Ilocos Norte", code: "ILN-SQ",  status: "inactive", members: 58,  specialization: "Medical",         location: "Laoag, Ilocos Norte" },
              { id: "sq-ilocos-s",    name: "Ilocos Sur",   code: "ILS-SQ",  status: "active",   members: 40,  specialization: "Supply",          location: "Vigan, Ilocos Sur" },
            ],
          },
        ],
      },

      // ── 7th ARCEN ───────────────────────────────────────────
      {
        id: "arcen-7th",
        name: "7th ARCEN",
        fullName: "7th Air Reserve Center",
        code: "7ARCEN",
        commander: "Brig. Gen. Roberto Torres",
        location: "Mactan Air Base, Cebu",
        reservists: 698,
        groups: [
          {
            id: "group-701rw",
            name: "701st Reserve Wing",
            code: "701RW",
            type: "Combat Support",
            commander: "Col. Victor Lim",
            reservists: 348,
            squadrons: [
              { id: "sq-cebu",        name: "Cebu",         code: "CBU-SQ",  status: "active",   members: 110, specialization: "Security",        location: "Cebu City, Cebu" },
              { id: "sq-bohol",       name: "Bohol",        code: "BHL-SQ",  status: "active",   members: 88,  specialization: "Engineering",     location: "Tagbilaran, Bohol" },
              { id: "sq-negros-occ",  name: "Negros Occ.",  code: "NGO-SQ",  status: "active",   members: 80,  specialization: "Medical",         location: "Bacolod, Negros Occidental" },
              { id: "sq-negros-or",   name: "Negros Or.",   code: "NGR-SQ",  status: "inactive", members: 70,  specialization: "Communications",  location: "Dumaguete, Negros Oriental" },
            ],
          },
          {
            id: "group-702rw",
            name: "702nd Reserve Wing",
            code: "702RW",
            type: "Medical",
            commander: "Col. Teresa Castillo",
            reservists: 350,
            squadrons: [
              { id: "sq-leyte",       name: "Leyte",        code: "LYT-SQ",  status: "active",   members: 95,  specialization: "Medical",         location: "Tacloban, Leyte" },
              { id: "sq-samar",       name: "Samar",        code: "SMR-SQ",  status: "active",   members: 88,  specialization: "Nursing",         location: "Catbalogan, Samar" },
              { id: "sq-biliran",     name: "Biliran",      code: "BLR-SQ",  status: "active",   members: 82,  specialization: "Dental",          location: "Naval, Biliran" },
              { id: "sq-eastern-sm",  name: "Eastern Samar",code: "ESM-SQ",  status: "inactive", members: 85,  specialization: "Medical",         location: "Borongan, Eastern Samar" },
            ],
          },
        ],
      },

      // ── 8th ARCEN ───────────────────────────────────────────
      {
        id: "arcen-8th",
        name: "8th ARCEN",
        fullName: "8th Air Reserve Center",
        code: "8ARCEN",
        commander: "Brig. Gen. Eduardo Morales",
        location: "Laguindingan Airport, Misamis Oriental",
        reservists: 550,
        groups: [
          // 509 Group — Cagayan etc.
          {
            id: "group-509",
            name: "509",
            code: "509RG",
            type: "Combat Support",
            commander: "Col. Marcos Dela Torre",
            reservists: 280,
            squadrons: [
              { id: "sq-cagayan-oro",  name: "Cagayan de Oro", code: "CDO-SQ",  status: "active",   members: 88,  specialization: "Security",       location: "Cagayan de Oro, Misamis Oriental" },
              { id: "sq-iligan",       name: "Iligan",          code: "ILG-SQ",  status: "active",   members: 72,  specialization: "Engineering",    location: "Iligan City, Lanao del Norte" },
              { id: "sq-camiguin",     name: "Camiguin",        code: "CMG-SQ",  status: "active",   members: 55,  specialization: "Communications", location: "Mambajao, Camiguin" },
              { id: "sq-lanao-n",      name: "Lanao Norte",     code: "LNN-SQ",  status: "inactive", members: 65,  specialization: "Medical",        location: "Tubod, Lanao del Norte" },
            ],
          },
          // TOGR 10 — Butuan, Surigao etc.
          {
            id: "group-togr10",
            name: "TOGR 10",
            code: "TOGR10",
            type: "Logistics",
            commander: "Col. Natividad Ocampo",
            reservists: 270,
            squadrons: [
              { id: "sq-butuan",       name: "Butuan",          code: "BTN-SQ",  status: "active",   members: 82,  specialization: "Supply",         location: "Butuan City, Agusan del Norte" },
              { id: "sq-surigao",      name: "Surigao",         code: "SRG-SQ",  status: "active",   members: 68,  specialization: "Transport",      location: "Surigao City, Surigao del Norte" },
              { id: "sq-tandag",       name: "Tandag",          code: "TDG-SQ",  status: "active",   members: 55,  specialization: "Maintenance",    location: "Tandag City, Surigao del Sur" },
              { id: "sq-bayugan",      name: "Bayugan",         code: "BYG-SQ",  status: "active",   members: 65,  specialization: "Administrative", location: "Bayugan City, Agusan del Sur" },
            ],
          },
        ],
      },
    ],
  },
];