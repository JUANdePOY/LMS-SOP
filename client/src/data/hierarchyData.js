/**
 * Hierarchy mock data
 * Structure: Area → ARCEN → Group → Squadron
 * Replace with real API calls using the same shape.
 */

export const hierarchyData = [
  {
    id: "area-1",
    name: "Butuan Area",
    code: "BTA",
    region: "Caraga",
    reservists: 621,
    readiness: 86.5,
    arcens: [
      {
        id: "arcen-1",
        name: "ARCEN-1 Butuan",
        code: "ARC1-BTA",
        commander: "Col. Jose Reyes",
        reservists: 312,
        groups: [
          {
            id: "group-1",
            name: "101st Reserve Group",
            code: "101RG",
            type: "Combat Support",
            reservists: 158,
            squadrons: [
              { id: "sq-1",  name: "Alpha Squadron",   code: "A-SQ",  status: "active",   members: 42, specialization: "Security" },
              { id: "sq-2",  name: "Bravo Squadron",   code: "B-SQ",  status: "active",   members: 38, specialization: "Engineering" },
              { id: "sq-3",  name: "Charlie Squadron", code: "C-SQ",  status: "inactive", members: 30, specialization: "Communications" },
              { id: "sq-4",  name: "Delta Squadron",   code: "D-SQ",  status: "active",   members: 48, specialization: "Medical" },
            ],
          },
          {
            id: "group-2",
            name: "102nd Reserve Group",
            code: "102RG",
            type: "Logistics",
            reservists: 154,
            squadrons: [
              { id: "sq-5",  name: "Echo Squadron",   code: "E-SQ",  status: "active",   members: 36, specialization: "Supply" },
              { id: "sq-6",  name: "Foxtrot Squadron", code: "F-SQ", status: "active",   members: 44, specialization: "Transport" },
              { id: "sq-7",  name: "Golf Squadron",    code: "G-SQ", status: "inactive", members: 28, specialization: "Maintenance" },
            ],
          },
        ],
      },
      {
        id: "arcen-2",
        name: "ARCEN-2 Butuan Airbase",
        code: "ARC2-BTA",
        commander: "Lt. Col. Maria Santos",
        reservists: 309,
        groups: [
          {
            id: "group-3",
            name: "103rd Reserve Group",
            code: "103RG",
            type: "Air Defense",
            reservists: 180,
            squadrons: [
              { id: "sq-8",  name: "Hotel Squadron",  code: "H-SQ",  status: "active",   members: 55, specialization: "Air Defense" },
              { id: "sq-9",  name: "India Squadron",  code: "I-SQ",  status: "active",   members: 60, specialization: "Radar Ops" },
              { id: "sq-10", name: "Juliet Squadron", code: "J-SQ",  status: "active",   members: 65, specialization: "Communications" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "area-2",
    name: "Surigao Area",
    code: "SGA",
    region: "Caraga",
    reservists: 548,
    readiness: 56.2,
    arcens: [
      {
        id: "arcen-3",
        name: "ARCEN-3 Surigao",
        code: "ARC3-SGA",
        commander: "Col. Ramon Cruz",
        reservists: 298,
        groups: [
          {
            id: "group-4",
            name: "201st Reserve Group",
            code: "201RG",
            type: "Combat Support",
            reservists: 148,
            squadrons: [
              { id: "sq-11", name: "Kilo Squadron",    code: "K-SQ", status: "active",   members: 38, specialization: "Security" },
              { id: "sq-12", name: "Lima Squadron",    code: "L-SQ", status: "inactive", members: 25, specialization: "Engineering" },
              { id: "sq-13", name: "Mike Squadron",    code: "M-SQ", status: "inactive", members: 30, specialization: "Medical" },
            ],
          },
          {
            id: "group-5",
            name: "202nd Reserve Group",
            code: "202RG",
            type: "Intelligence",
            reservists: 150,
            squadrons: [
              { id: "sq-14", name: "November Squadron", code: "N-SQ", status: "active",   members: 48, specialization: "Intel" },
              { id: "sq-15", name: "Oscar Squadron",    code: "O-SQ", status: "active",   members: 52, specialization: "Surveillance" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "area-3",
    name: "Tandag Area",
    code: "TDA",
    region: "Caraga",
    reservists: 208,
    readiness: 76.9,
    arcens: [
      {
        id: "arcen-4",
        name: "ARCEN-4 Tandag",
        code: "ARC4-TDA",
        commander: "Maj. Elena Flores",
        reservists: 208,
        groups: [
          {
            id: "group-6",
            name: "301st Reserve Group",
            code: "301RG",
            type: "Combat Support",
            reservists: 120,
            squadrons: [
              { id: "sq-16", name: "Papa Squadron",   code: "P-SQ", status: "active",   members: 40, specialization: "Security" },
              { id: "sq-17", name: "Quebec Squadron", code: "Q-SQ", status: "active",   members: 42, specialization: "Engineering" },
              { id: "sq-18", name: "Romeo Squadron",  code: "R-SQ", status: "inactive", members: 38, specialization: "Logistics" },
            ],
          },
          {
            id: "group-7",
            name: "302nd Reserve Group",
            code: "302RG",
            type: "Logistics",
            reservists: 88,
            squadrons: [
              { id: "sq-19", name: "Sierra Squadron", code: "S-SQ", status: "active", members: 44, specialization: "Supply" },
              { id: "sq-20", name: "Tango Squadron",  code: "T-SQ", status: "active", members: 44, specialization: "Transport" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "area-4",
    name: "Bayugan Area",
    code: "BYA",
    region: "Caraga",
    reservists: 276,
    readiness: 81.7,
    arcens: [
      {
        id: "arcen-5",
        name: "ARCEN-5 Bayugan",
        code: "ARC5-BYA",
        commander: "Col. Victor Lim",
        reservists: 276,
        groups: [
          {
            id: "group-8",
            name: "401st Reserve Group",
            code: "401RG",
            type: "Air Defense",
            reservists: 140,
            squadrons: [
              { id: "sq-21", name: "Uniform Squadron", code: "U-SQ", status: "active", members: 48, specialization: "Air Defense" },
              { id: "sq-22", name: "Victor Squadron",  code: "V-SQ", status: "active", members: 46, specialization: "Radar Ops" },
            ],
          },
          {
            id: "group-9",
            name: "402nd Reserve Group",
            code: "402RG",
            type: "Medical",
            reservists: 136,
            squadrons: [
              { id: "sq-23", name: "Whiskey Squadron", code: "W-SQ", status: "active",   members: 50, specialization: "Medical" },
              { id: "sq-24", name: "X-ray Squadron",   code: "X-SQ", status: "inactive", members: 42, specialization: "Dental" },
              { id: "sq-25", name: "Yankee Squadron",  code: "Y-SQ", status: "active",   members: 44, specialization: "Nursing" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "area-5",
    name: "Cabadbaran Area",
    code: "CBA",
    region: "Caraga",
    reservists: 449,
    readiness: 72.4,
    arcens: [
      {
        id: "arcen-6",
        name: "ARCEN-6 Cabadbaran",
        code: "ARC6-CBA",
        commander: "Lt. Col. Ana Mendoza",
        reservists: 449,
        groups: [
          {
            id: "group-10",
            name: "501st Reserve Group",
            code: "501RG",
            type: "Combat Support",
            reservists: 220,
            squadrons: [
              { id: "sq-26", name: "Zulu Squadron",   code: "Z-SQ",   status: "active",   members: 55, specialization: "Security" },
              { id: "sq-27", name: "Alpha-2 Squadron", code: "A2-SQ", status: "active",   members: 58, specialization: "Engineering" },
              { id: "sq-28", name: "Bravo-2 Squadron", code: "B2-SQ", status: "inactive", members: 45, specialization: "Communications" },
            ],
          },
          {
            id: "group-11",
            name: "502nd Reserve Group",
            code: "502RG",
            type: "Intelligence",
            reservists: 229,
            squadrons: [
              { id: "sq-29", name: "Charlie-2 Squadron", code: "C2-SQ", status: "active", members: 62, specialization: "Intel" },
              { id: "sq-30", name: "Delta-2 Squadron",   code: "D2-SQ", status: "active", members: 60, specialization: "Cyber" },
            ],
          },
        ],
      },
    ],
  },
];
