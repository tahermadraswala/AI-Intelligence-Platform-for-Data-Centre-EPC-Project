// ─────────────────────────────────────────────────────────────
// Document Q&A — Mock Data Layer
// Domain: DataCentre Mumbai Phase 1 — EPC Project Documents
// ─────────────────────────────────────────────────────────────

export const documents = [
  {
    id: 'doc-1',
    code: 'ELEC-SLD-001 Rev B',
    name: 'Electrical Single Line Diagram',
    discipline: 'ELECTRICAL',
    docType: 'Drawing',
    pages: 14,
    size: '4.2 MB',
    status: 'indexed',
    chunks: 87,
    lastUpdated: '2026-05-10',
    active: true,
  },
  {
    id: 'doc-2',
    code: 'ELEC-UPS-DS-001',
    name: 'UPS Vendor Datasheet — Eaton 9PX',
    discipline: 'ELECTRICAL',
    docType: 'Datasheet',
    pages: 22,
    size: '2.1 MB',
    status: 'indexed',
    chunks: 134,
    lastUpdated: '2026-06-12',
    active: true,
  },
  {
    id: 'doc-3',
    code: 'MECH-SPEC-SEC14',
    name: 'HVAC Specification Section 14',
    discipline: 'MECHANICAL',
    docType: 'Specification',
    pages: 47,
    size: '3.8 MB',
    status: 'indexed',
    chunks: 289,
    lastUpdated: '2026-04-20',
    active: true,
  },
  {
    id: 'doc-4',
    code: 'MECH-GA-001 Rev A',
    name: 'Mechanical GA Drawing',
    discipline: 'MECHANICAL',
    docType: 'Drawing',
    pages: 8,
    size: '18.4 MB',
    status: 'indexed',
    chunks: 41,
    lastUpdated: '2026-05-18',
    active: true,
  },
  {
    id: 'doc-5',
    code: 'STD-TIA942-2023',
    name: 'TIA-942 Data Centre Standards',
    discipline: 'STANDARDS',
    docType: 'Standard',
    pages: 189,
    size: '8.7 MB',
    status: 'indexed',
    chunks: 1124,
    lastUpdated: '2023-11-15',
    active: true,
  },
  {
    id: 'doc-6',
    code: 'STD-ASHRAE90A',
    name: 'ASHRAE 90.1 Thermal Guidelines',
    discipline: 'STANDARDS',
    docType: 'Standard',
    pages: 312,
    size: '12.3 MB',
    status: 'indexed',
    chunks: 1891,
    lastUpdated: '2022-08-10',
    active: true,
  },
  {
    id: 'doc-7',
    code: 'COMM-FAT-CHR-01',
    name: 'Chiller FAT Commissioning Report',
    discipline: 'COMMISSIONING',
    docType: 'Report',
    pages: 31,
    size: '1.6 MB',
    status: 'indexed',
    chunks: 198,
    lastUpdated: '2026-07-02',
    active: true,
  },
]

// ─── Suggested questions shown in the empty state ──────────
export const suggestedQuestions = [
  'What are the cooling redundancy requirements defined in TIA-942 for Tier III classification?',
  'Summarise the HVAC commissioning acceptance criteria from the Chiller FAT report.',
  'What UPS battery autonomy is required for this facility under TIA-942?',
  'Are there any technical conflicts between the HVAC specification and the vendor submittal?',
]

// ─── Pre-loaded conversation (3 exchanges) ─────────────────
// IDs are explicit so selectedAnswerId can reference them on init
export const initialMessages = [
  // ── Exchange 1: Cooling Capacity ────────────────────────
  {
    id: 'init-q-1',
    type: 'question',
    text: 'What is the minimum cooling capacity required by the project specification for Chiller Unit CH-01, and how does the vendor submittal compare?',
    timestamp: '09:14',
    scope: 7,
  },
  {
    id: 'init-a-1',
    type: 'answer',
    questionId: 'init-q-1',
    timestamp: '09:14',
    confidence: 87,
    sourcesCount: 3,
    responseTime: 1.8,
    answer:
      'Chiller Unit CH-01\'s actual factory-tested performance of 740 kW [2] fails to meet the specified minimum net cooling capacity of 800 kW [1], representing a 7.5% shortfall that exceeds the contractually allowed tolerance of ±5% [1].',
    reasoning:
      'The project specification (Clause 14.3.1) mandates a minimum net cooling capacity of 800 kW at design ambient conditions of 35°C at the condenser inlet [1]. This must be verified using ARI 550/590 test conditions per ASHRAE guidelines [3]. The Factory Acceptance Test (FAT) commissioning report logs the unit\'s actual performance at 740 kW under test conditions [2], which is a 7.5% deviation. Because the FAT was conducted at 30°C ambient instead of the design temperature of 35°C [2], real-site performance at design temperature will degrade even further beyond this threshold, violating the ±5% tolerance in Clause 14.3.2 [1].',
    conclusion:
      'The equipment is non-compliant with project specification MECH-SPEC-SEC14 [1]. Issue a formal Engineering Non-Conformance Report (NCR) to the vendor and request updated performance derating calculations at 35°C ambient prior to field deployment.',
    citations: [
      {
        index: 1,
        docCode: 'MECH-SPEC-SEC14',
        docName: 'HVAC Specification Section 14',
        page: 7,
        clause: '§14.3.1–14.3.2',
        relevance: 94,
        excerpt:
          '"...minimum net cooling capacity of 800 kW shall be maintained at design ambient conditions of 35°C at the chiller condenser inlet. Actual capacity shall be verified under ARI 550/590 test conditions and shall not deviate from the specified value by more than ±5% of the nominal requirement as defined herein..."',
      },
      {
        index: 2,
        docCode: 'COMM-FAT-CHR-01',
        docName: 'Chiller FAT Commissioning Report',
        page: 3,
        clause: '§2.1',
        relevance: 88,
        excerpt:
          '"...CH-01 net cooling capacity measured at 740 kW at FAT ambient conditions of 30°C. Performance verification at 35°C ambient design condition was not conducted during FAT due to environmental chamber limitations. Derating curves provided in Appendix B for reference..."',
      },
      {
        index: 3,
        docCode: 'STD-ASHRAE90A',
        docName: 'ASHRAE 90.1 Thermal Guidelines',
        page: 44,
        clause: '§6.3.2',
        relevance: 71,
        excerpt:
          '"...rated cooling equipment capacity shall be determined and rated in accordance with the applicable referenced test procedures. Equipment shall be rated at ARI conditions unless otherwise approved in writing by the authority having jurisdiction over the project..."',
      },
    ],
  },

  // ── Exchange 2: UPS Battery Autonomy ────────────────────
  {
    id: 'init-q-2',
    type: 'question',
    text: 'What UPS battery autonomy is required for this facility under TIA-942 Tier III classification?',
    timestamp: '09:17',
    scope: 7,
  },
  {
    id: 'init-a-2',
    type: 'answer',
    questionId: 'init-q-2',
    timestamp: '09:18',
    confidence: 92,
    sourcesCount: 3,
    responseTime: 2.3,
    answer:
      'The facility requires a minimum of 10 minutes of UPS battery autonomy at full IT nameplate load under TIA-942 Tier III standards [1]. The specified Eaton 9PX unit delivers 12 minutes of autonomy at rated load [2], satisfying the requirement with a 2-minute margin.',
    reasoning:
      'Under TIA-942 (§6.4.2), Tier III facilities must provide at least 10 minutes of UPS autonomy calculated using full nameplate load [1]. The Eaton 9PX vendor datasheet verifies 12 minutes of runtime at 160 kVA rated load [2]. However, the datasheet warns that battery capacity declines to 80% of nominal at the end of its 5-year service life [2], reducing autonomy to ~9.6 minutes and falling below the 10-minute threshold without proactive battery maintenance. N+1 redundancy must also be verified for all critical power modules to eliminate single points of failure per TIA-942 (§6.4.5) [3].',
    conclusion:
      'The initial battery configuration is compliant [2], but operational procedures must mandate battery replacements at Year 4 to prevent runtime from degrading below the TIA-942 10-minute threshold [1].',
    citations: [
      {
        index: 1,
        docCode: 'STD-TIA942-2023',
        docName: 'TIA-942 Data Centre Standards',
        page: 67,
        clause: '§6.4.2',
        relevance: 96,
        excerpt:
          '"...Tier III facilities shall provide a minimum of 10 minutes of UPS battery autonomy at full IT equipment nameplate load capacity. Battery autonomy shall be verified under rated load bank testing at the commissioning stage and documented in the facility commissioning certificate..."',
      },
      {
        index: 2,
        docCode: 'ELEC-UPS-DS-001',
        docName: 'UPS Vendor Datasheet — Eaton 9PX',
        page: 8,
        clause: '§3.1',
        relevance: 91,
        excerpt:
          '"...Battery runtime: 12 minutes at 160 kVA rated load with standard internal battery module configuration. Battery capacity reduces to approximately 80% of nominal rating at end of rated battery service life, typically 5 years at 25°C ambient operating temperature..."',
      },
      {
        index: 3,
        docCode: 'STD-TIA942-2023',
        docName: 'TIA-942 Data Centre Standards',
        page: 71,
        clause: '§6.4.5',
        relevance: 83,
        excerpt:
          '"...Tier III classification requires N+1 redundancy in all UPS module configurations supplying critical IT loads. Single points of failure within the UPS distribution system shall be identified, documented, and remediated prior to Tier III certification audit..."',
      },
    ],
  },

  // ── Exchange 3: Specification Conflicts ─────────────────
  {
    id: 'init-q-3',
    type: 'question',
    text: 'Identify any technical conflicts between the HVAC specification and the chiller vendor submittal documents.',
    timestamp: '09:22',
    scope: 7,
  },
  {
    id: 'init-a-3',
    type: 'answer',
    questionId: 'init-q-3',
    timestamp: '09:23',
    confidence: 79,
    sourcesCount: 4,
    responseTime: 3.1,
    answer:
      'Three technical conflicts were identified: a 7.5% cooling capacity shortfall [1, 2], an 18.3% operating pressure limit shortfall [1, 2], and a 300 mm maintenance access clearance deficit in the physical plant layout [3, 4].',
    reasoning:
      'The project specification MECH-SPEC-SEC14 (§14.3.1) specifies a minimum cooling capacity of 800 kW at 35°C ambient and 1,200 kPa HP operating limit [1]. However, the FAT report records a measured capacity of 740 kW at 30°C and a max HP circuit pressure of only 980 kPa [2]. Furthermore, the mechanical GA drawing MECH-GA-001 (§A.4 Note 3) plans for 900 mm clearance between the unit and the wall [4], whereas the vendor FAT commissioning report (§5.2) mandates at least 1,200 mm of clearance for cartridge removal during maintenance [3].',
    conclusion:
      'Modify the plant room layout to accommodate the 1,200 mm vendor service clearance [3]. In parallel, submit a technical variance request for the capacity and operating pressure deviations for owner approval.',
    citations: [
      {
        index: 1,
        docCode: 'MECH-SPEC-SEC14',
        docName: 'HVAC Specification Section 14',
        page: 7,
        clause: '§14.3.1',
        relevance: 93,
        excerpt:
          '"...minimum net cooling capacity of 800 kW at 35°C ambient and minimum high-pressure side operating limit of 1,200 kPa shall be maintained under all operating conditions specified herein..."',
      },
      {
        index: 2,
        docCode: 'COMM-FAT-CHR-01',
        docName: 'Chiller FAT Commissioning Report',
        page: 3,
        clause: '§2.1',
        relevance: 89,
        excerpt:
          '"...CH-01 measured performance at FAT: cooling capacity 740 kW at 30°C ambient; HP circuit pressure 980 kPa at rated conditions. Both values represent pre-delivery factory performance and are subject to variation under in-situ operating conditions..."',
      },
      {
        index: 3,
        docCode: 'COMM-FAT-CHR-01',
        docName: 'Chiller FAT Commissioning Report',
        page: 19,
        clause: '§5.2',
        relevance: 76,
        excerpt:
          '"...Vendor requires minimum 1,200 mm of unobstructed access clearance on the compressor service side for compressor cartridge removal during planned maintenance. This clearance shall not be reduced or obstructed under any operating or maintenance condition..."',
      },
      {
        index: 4,
        docCode: 'MECH-GA-001 Rev A',
        docName: 'Mechanical GA Drawing',
        page: 4,
        clause: '§A.4 Note 3',
        relevance: 81,
        excerpt:
          '"...CH-01 plant room layout: 900 mm clearance shown between chiller unit service face and structural wall. Note: Refer to equipment vendor installation and maintenance requirements for minimum access clearances. Verify prior to installation..."',
      },
    ],
  },
]

// ─── Canned response for live question generation ──────────
// Returned for any new question typed by the engineer.
// Reasoning uses [N] inline citations matching the citations array.
export const cannedResponse = {
  confidence: 84,
  sourcesCount: 3,
  responseTime: 2.2,
  answer:
    'Based on the search across indexed project documents, compliance requirements for the requested query are governed by standard verification guidelines [1]. Dynamic testing parameters must be cross-referenced against factory reports to confirm design-basis compliance [2].',
  reasoning:
    'Engineering specifications under MECH-SPEC-SEC14 (§14.6.1) dictate that all mechanical plant components undergo formal Factory Acceptance Testing (FAT) to verify ratings under project-specified design thresholds [1]. The vendor chiller report logs these procedures in detail [2]. However, if in-situ ambient conditions vary from the design parameters, appropriate derating curves must be applied to evaluate operating margins. Compliance standards per TIA-942 (§8.2.1) require a formal variance management and change process if equipment performance drops below contractual limits [3].',
  conclusion:
    'Verify that the local equipment submittals match the design parameters in the specification [1], and request additional vendor calculations if operational margins are narrow [3].',
  citations: [
    {
      index: 1,
      docCode: 'MECH-SPEC-SEC14',
      docName: 'HVAC Specification Section 14',
      page: 12,
      clause: '§14.6.1',
      relevance: 88,
      excerpt:
        '"...All mechanical plant and systems shall comply with the performance requirements specified herein and shall be formally verified through documented commissioning procedures. Performance verification records shall be maintained as project handover documentation..."',
    },
    {
      index: 2,
      docCode: 'COMM-FAT-CHR-01',
      docName: 'Chiller FAT Commissioning Report',
      page: 11,
      clause: '§3.4',
      relevance: 82,
      excerpt:
        '"...Performance verification testing was conducted in accordance with the project specification requirements and relevant TIA-942 standards. Test results are documented in Appendix A with all supporting test certificates and instrument calibration records attached..."',
    },
    {
      index: 3,
      docCode: 'STD-TIA942-2023',
      docName: 'TIA-942 Data Centre Standards',
      page: 98,
      clause: '§8.2.1',
      relevance: 74,
      excerpt:
        '"...Data centre infrastructure components shall maintain specified performance parameters throughout their design operational lifecycle. Performance degradation beyond contractual tolerances shall be addressed through a formal change management and deviation approval process..."',
    },
  ],
}
