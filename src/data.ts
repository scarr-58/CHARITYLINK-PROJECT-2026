import { Campaign } from './types';

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 1,
    icon: '💧',
    category: 'Water',
    title: 'Clean Water for Turkana County Schools',
    org: 'Maji Safi Initiative',
    desc: 'Over 3,200 pupils in Turkana County walk more than 5 km daily to reach contaminated water sources. This campaign funds the installation of 12 solar-powered boreholes and filtration systems directly at school compounds, eliminating waterborne illness and improving attendance — especially among girls.',
    short: 'Providing clean, safe water directly to 12 schools in Turkana County through solar-powered boreholes and filtration systems.',
    raised: 380000,
    target: 600000,
    donors: 214,
    verified: true,
    impact: [
      { num: '12', lbl: 'Boreholes Planned' },
      { num: '3,200', lbl: 'Pupils Served' },
      { num: '6', lbl: 'Installed So Far' }
    ],
    usage: '65% goes to borehole drilling and equipment, 20% to solar infrastructure, 10% to maintenance training for local staff, and 5% to monitoring and reporting.',
    color: '#e8f4fd'
  },
  {
    id: 2,
    icon: '📚',
    category: 'Education',
    title: 'Bursary Fund for Kibera Secondary Students',
    org: 'Elimu Kwanza Foundation',
    desc: 'Hundreds of bright students in Kibera leave school each year not due to poor performance but because of school fee arrears. This fund pays full year tuition, exam fees, and provides learning materials for 80 Form 3 and Form 4 students who are at risk of dropping out.',
    short: 'Covering full tuition and exam fees for 80 secondary school students in Kibera who risk dropping out due to financial hardship.',
    raised: 215000,
    target: 400000,
    donors: 312,
    verified: true,
    impact: [
      { num: '80', lbl: 'Students Supported' },
      { num: '100%', lbl: 'Exam Pass Rate' },
      { num: 'KES 2,500', lbl: 'Cost per Month' }
    ],
    usage: '90% directly covers school fees and learning materials. 10% is used for student welfare, mentorship events, and administrative costs.',
    color: '#fef9e7'
  },
  {
    id: 3,
    icon: '🏥',
    category: 'Health',
    title: 'Mobile Maternal Clinic — Marsabit',
    org: 'Afya Yetu Health Trust',
    desc: 'Maternal mortality in Marsabit remains critically high due to distance from health facilities. This campaign equips and operates a mobile clinic that visits 18 remote villages monthly, providing antenatal care, safe delivery kits, postnatal follow-ups, and emergency referrals.',
    short: 'A mobile clinic serving 18 remote villages in Marsabit with antenatal care and emergency maternal health services.',
    raised: 520000,
    target: 700000,
    donors: 489,
    verified: true,
    impact: [
      { num: '18', lbl: 'Villages Covered' },
      { num: '640', lbl: 'Mothers Reached' },
      { num: '34', lbl: 'Safe Deliveries' }
    ],
    usage: '55% on medical supplies and equipment, 30% on fuel and vehicle maintenance, 10% on healthcare worker salaries, 5% on administration.',
    color: '#fdf2f8'
  },
  {
    id: 4,
    icon: '🌱',
    category: 'Livelihood',
    title: 'Youth Agri-Business Incubator — Nakuru',
    org: 'Vijana Farms Kenya',
    desc: 'Unemployed youth in Nakuru are trained in modern farming techniques, agri-business planning, and market linkages. Each cohort of 30 graduates receives a startup input grant to launch small-scale commercial farms producing vegetables and poultry for Nairobi markets.',
    short: 'Training and funding 30 unemployed youth per cohort to launch agri-businesses in Nakuru County.',
    raised: 160000,
    target: 350000,
    donors: 97,
    verified: true,
    impact: [
      { num: '60', lbl: 'Youth Trained' },
      { num: '2', lbl: 'Cohorts Complete' },
      { num: 'KES 20K', lbl: 'Avg Startup Grant' }
    ],
    usage: '40% startup input grants, 35% training and facilitation, 15% market linkage support, 10% program management.',
    color: '#eafaf1'
  },
  {
    id: 5,
    icon: '🆘',
    category: 'Emergency',
    title: 'El Niño Flood Relief — Tana River',
    org: 'Kenya Disaster Response Network',
    desc: 'Severe flooding along the Tana River has displaced over 4,000 families. This emergency campaign delivers food parcels, temporary shelter, clean water, and hygiene kits to affected households while recovery plans are put in place with county government partners.',
    short: 'Emergency relief — food, shelter, and clean water — for 4,000+ flood-displaced families along Tana River.',
    raised: 890000,
    target: 1000000,
    donors: 762,
    verified: true,
    impact: [
      { num: '4,200', lbl: 'Families Reached' },
      { num: '8,400', lbl: 'Food Parcels' },
      { num: '210', lbl: 'Shelter Kits' }
    ],
    usage: '70% food and non-food items, 15% logistics and transport, 10% water purification, 5% coordination.',
    color: '#fef5e7'
  },
  {
    id: 6,
    icon: '🌳',
    category: 'Environment',
    title: 'Reforesting the Aberdare Range',
    org: 'Msitu wa Kenya',
    desc: 'The Aberdare catchment feeds eight major rivers supplying Nairobi with water. Decades of encroachment have degraded 30,000 hectares. This campaign plants indigenous tree species, partners with local communities for stewardship, and monitors forest recovery through satellite imaging.',
    short: 'Planting indigenous trees across degraded Aberdare highland zones and training local communities as forest stewards.',
    raised: 295000,
    target: 500000,
    donors: 418,
    verified: true,
    impact: [
      { num: '45,000', lbl: 'Trees Planted' },
      { num: '120ha', lbl: 'Area Restored' },
      { num: '80', lbl: 'Community Rangers' }
    ],
    usage: '50% seedling nurseries and planting, 25% community ranger program, 15% monitoring technology, 10% education and outreach.',
    color: '#e8f8f5'
  }
];

export const CATEGORIES = ['All', 'Education', 'Health', 'Water', 'Livelihood', 'Emergency', 'Environment'];
