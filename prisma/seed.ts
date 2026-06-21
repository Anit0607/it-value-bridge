import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { Stage, ProcessGroup, BenefitCategory, InitiativeType, DelaySource } from '@prisma/client';

const prisma = new PrismaClient();

const STAGE_TO_PG: Record<Stage, ProcessGroup> = {
  BRD: 'PLANNING',
  FSD: 'PLANNING',
  COMMERCIAL: 'PLANNING',
  DEVELOPMENT: 'EXECUTING',
  SIT: 'EXECUTING',
  UAT: 'EXECUTING',
  APPSEC: 'EXECUTING',
  CAB_APPROVAL: 'EXECUTING',
  GO_LIVE: 'EXECUTING',
  BUSINESS_VALIDATION: 'MONITORING_CONTROLLING',
  CLOSED: 'CLOSING',
};

async function main() {
  const password = await bcrypt.hash('Demo@1234!', 12);

  // --- Demo users ---
  const cio = await prisma.user.upsert({
    where: { email: 'cio@bank.com' },
    update: {},
    create: { name: 'Mahesh Iyer', email: 'cio@bank.com', passwordHash: password, role: 'CIO' },
  });

  const pmo = await prisma.user.upsert({
    where: { email: 'pmo@bank.com' },
    update: {},
    create: { name: 'Anita Desai', email: 'pmo@bank.com', passwordHash: password, role: 'PMO' },
  });

  const vh = await prisma.user.upsert({
    where: { email: 'vh@bank.com' },
    update: {},
    create: {
      name: 'Rajesh Kumar',
      email: 'vh@bank.com',
      passwordHash: password,
      role: 'VERTICAL_HEAD',
      verticalHead: 'Rajesh Kumar',
    },
  });

  const business = await prisma.user.upsert({
    where: { email: 'business@bank.com' },
    update: {},
    create: { name: 'Anil Kumar', email: 'business@bank.com', passwordHash: password, role: 'BUSINESS' },
  });

  console.log('Seeded 4 users:', cio.email, pmo.email, vh.email, business.email);

  // --- Initiatives ---
  type InitiativeSeed = {
    title: string;
    type: InitiativeType;
    verticalHeadName: string;
    businessSpoc: string;
    businessSponsor: string;
    description: string;
    benefitCategory: BenefitCategory;
    outcomeDescription: string;
    targetMetric: string;
    expectedGoLiveDate: Date;
    currentStage: Stage;
    stageStartDate: Date;
    stageExpectedDate: Date;
    lastUpdated: Date;
    notes: string;
    delayed: boolean;
    delaySource?: DelaySource;
    committedMonth?: string;
    history: { stage: Stage; date: Date; user: string; note: string }[];
    validation?: { outcomeAchieved: 'YES' | 'PARTIALLY' | 'NO'; actualResult: string; actualMetric: string };
  };

  const d = (s: string) => new Date(s);

  const initiatives: InitiativeSeed[] = [
    {
      title: 'Mobile Banking App Upgrade',
      type: 'PROJECT',
      verticalHeadName: 'Rajesh Kumar',
      businessSpoc: 'Anil Kumar',
      businessSponsor: 'Deepak Mehta',
      description: 'Upgrade mobile banking app to support UPI 2.0, biometric login, and personalized dashboard for 5M+ users.',
      benefitCategory: 'CUSTOMER_EXPERIENCE',
      outcomeDescription: 'Improved app rating from 3.2 to 4.5 and 40% increase in daily active users.',
      targetMetric: 'Increase DAU by 40% and app store rating to 4.5',
      expectedGoLiveDate: d('2026-08-15'),
      currentStage: 'DEVELOPMENT',
      stageStartDate: d('2026-06-01'),
      stageExpectedDate: d('2026-07-15'),
      lastUpdated: d('2026-06-14'),
      notes: 'Backend API integration 70% complete. UPI 2.0 module under testing.',
      delayed: false,
      committedMonth: '2026-06',
      history: [
        { stage: 'BRD', date: d('2026-03-10'), user: 'Anita Desai', note: 'BRD signed off by business' },
        { stage: 'FSD', date: d('2026-04-05'), user: 'Anita Desai', note: 'FSD approved' },
        { stage: 'COMMERCIAL', date: d('2026-04-25'), user: 'Anita Desai', note: 'Vendor selected, PO raised' },
        { stage: 'DEVELOPMENT', date: d('2026-06-01'), user: 'Rajesh Kumar', note: 'Development started' },
      ],
    },
    {
      title: 'UPI Enhancement v2.0',
      type: 'CHANGE_REQUEST',
      verticalHeadName: 'Priya Sharma',
      businessSpoc: 'Meena Gupta',
      businessSponsor: 'Ramesh Jain',
      description: 'Enable UPI AutoPay, recurring mandates, and international UPI transactions per RBI circular.',
      benefitCategory: 'REVENUE',
      outcomeDescription: 'Capture ₹50Cr incremental UPI revenue from recurring payment mandates.',
      targetMetric: 'Increase UPI transaction volume by 25%',
      expectedGoLiveDate: d('2026-07-15'),
      currentStage: 'SIT',
      stageStartDate: d('2026-06-05'),
      stageExpectedDate: d('2026-06-25'),
      lastUpdated: d('2026-06-14'),
      notes: 'SIT cycle 2 in progress. 3 defects pending closure.',
      delayed: false,
      history: [
        { stage: 'BRD', date: d('2026-04-01'), user: 'Anita Desai', note: 'BRD completed' },
        { stage: 'FSD', date: d('2026-04-20'), user: 'Anita Desai', note: 'FSD finalized' },
        { stage: 'COMMERCIAL', date: d('2026-05-05'), user: 'Anita Desai', note: 'In-house development approved' },
        { stage: 'DEVELOPMENT', date: d('2026-05-15'), user: 'Priya Sharma', note: 'Dev complete' },
        { stage: 'SIT', date: d('2026-06-05'), user: 'Priya Sharma', note: 'SIT started' },
      ],
    },
    {
      title: 'CBS Core Integration',
      type: 'PROJECT',
      verticalHeadName: 'Amit Patel',
      businessSpoc: 'Rakesh Joshi',
      businessSponsor: 'Sunil Agarwal',
      description: 'Integrate new CBS (Core Banking System) with 12 legacy modules including Loans, FD, and Trade Finance.',
      benefitCategory: 'EFFICIENCY',
      outcomeDescription: 'Reduce batch processing time from 6 hours to 45 minutes.',
      targetMetric: 'Reduce batch processing time by 87%',
      expectedGoLiveDate: d('2026-09-01'),
      currentStage: 'DEVELOPMENT',
      stageStartDate: d('2026-05-15'),
      stageExpectedDate: d('2026-06-10'),
      lastUpdated: d('2026-06-13'),
      notes: 'Loan module integration blocked on CBS vendor API documentation. Escalated.',
      delayed: true,
      delaySource: 'VENDOR',
      history: [
        { stage: 'BRD', date: d('2026-02-10'), user: 'Anita Desai', note: 'BRD finalized' },
        { stage: 'FSD', date: d('2026-03-01'), user: 'Anita Desai', note: 'FSD approved' },
        { stage: 'COMMERCIAL', date: d('2026-03-20'), user: 'Anita Desai', note: 'Contract signed with CBS vendor' },
        { stage: 'DEVELOPMENT', date: d('2026-05-15'), user: 'Amit Patel', note: 'Development started. Vendor delays noted.' },
      ],
    },
    {
      title: 'KYC Automation System',
      type: 'PROJECT',
      verticalHeadName: 'Sunita Verma',
      businessSpoc: 'Suman Bose',
      businessSponsor: 'Geeta Krishnan',
      description: 'Implement AI-based KYC verification with video KYC, OCR for documents, and real-time CKYC registry check.',
      benefitCategory: 'COMPLIANCE',
      outcomeDescription: 'Reduce KYC TAT from 3 days to 4 hours and achieve 100% regulatory compliance.',
      targetMetric: 'Reduce KYC TAT by 95% to under 4 hours',
      expectedGoLiveDate: d('2026-09-30'),
      currentStage: 'UAT',
      stageStartDate: d('2026-06-10'),
      stageExpectedDate: d('2026-08-01'),
      lastUpdated: d('2026-06-15'),
      notes: 'UAT started. Business team testing video KYC flow.',
      delayed: false,
      history: [
        { stage: 'BRD', date: d('2026-01-15'), user: 'Anita Desai', note: 'BRD approved' },
        { stage: 'FSD', date: d('2026-02-20'), user: 'Anita Desai', note: 'FSD finalized with AI vendor' },
        { stage: 'COMMERCIAL', date: d('2026-03-10'), user: 'Anita Desai', note: 'AI vendor contracted' },
        { stage: 'DEVELOPMENT', date: d('2026-04-01'), user: 'Sunita Verma', note: 'Development in progress' },
        { stage: 'SIT', date: d('2026-05-20'), user: 'Sunita Verma', note: 'SIT completed with 2 minor defects fixed' },
        { stage: 'UAT', date: d('2026-06-10'), user: 'Sunita Verma', note: 'UAT commenced' },
      ],
    },
    {
      title: 'Payment Gateway Upgrade',
      type: 'CHANGE_REQUEST',
      verticalHeadName: 'Vikram Singh',
      businessSpoc: 'Priti Sharma',
      businessSponsor: 'Arvind Nair',
      description: 'Upgrade payment gateway to support tokenization, 3DS 2.0, and RuPay credit on UPI.',
      benefitCategory: 'REVENUE',
      outcomeDescription: 'Reduce payment failures by 60% and increase merchant onboarding by 30%.',
      targetMetric: 'Reduce payment failure rate from 4.2% to 1.5%',
      expectedGoLiveDate: d('2026-07-05'),
      currentStage: 'CAB_APPROVAL',
      stageStartDate: d('2026-06-08'),
      stageExpectedDate: d('2026-06-28'),
      lastUpdated: d('2026-06-14'),
      notes: 'CAB presentation scheduled for June 20. All SIT defects closed.',
      delayed: false,
      committedMonth: '2026-06',
      history: [
        { stage: 'BRD', date: d('2026-04-10'), user: 'Anita Desai', note: 'BRD signed' },
        { stage: 'FSD', date: d('2026-04-28'), user: 'Anita Desai', note: 'FSD approved' },
        { stage: 'COMMERCIAL', date: d('2026-05-08'), user: 'Anita Desai', note: 'Vendor PO issued' },
        { stage: 'DEVELOPMENT', date: d('2026-05-15'), user: 'Vikram Singh', note: 'Dev complete' },
        { stage: 'SIT', date: d('2026-05-28'), user: 'Vikram Singh', note: 'SIT passed' },
        { stage: 'UAT', date: d('2026-06-05'), user: 'Vikram Singh', note: 'UAT signed off' },
        { stage: 'APPSEC', date: d('2026-06-06'), user: 'Vikram Singh', note: 'AppSec cleared' },
        { stage: 'CAB_APPROVAL', date: d('2026-06-08'), user: 'Vikram Singh', note: 'Submitted to CAB' },
      ],
    },
    {
      title: 'NACH Mandate Processing',
      type: 'CHANGE_REQUEST',
      verticalHeadName: 'Rajesh Kumar',
      businessSpoc: 'Anil Kumar',
      businessSponsor: 'Deepak Mehta',
      description: 'Implement NACH mandate registration, amendment, and cancellation through digital channels per NPCI guidelines.',
      benefitCategory: 'COST_SAVING',
      outcomeDescription: 'Save ₹2Cr annually by eliminating paper-based NACH processing.',
      targetMetric: 'Reduce NACH processing cost by 80%',
      expectedGoLiveDate: d('2026-09-30'),
      currentStage: 'FSD',
      stageStartDate: d('2026-06-10'),
      stageExpectedDate: d('2026-07-30'),
      lastUpdated: d('2026-06-13'),
      notes: 'FSD drafting in progress. NPCI technical specs received.',
      delayed: false,
      history: [
        { stage: 'BRD', date: d('2026-05-15'), user: 'Anita Desai', note: 'BRD approved' },
        { stage: 'FSD', date: d('2026-06-10'), user: 'Rajesh Kumar', note: 'FSD drafting started' },
      ],
    },
    {
      title: 'Retail Loan Origination Portal',
      type: 'PROJECT',
      verticalHeadName: 'Priya Sharma',
      businessSpoc: 'Meena Gupta',
      businessSponsor: 'Ramesh Jain',
      description: 'Build end-to-end digital loan origination portal for retail loans covering personal, home, and auto loans.',
      benefitCategory: 'REVENUE',
      outcomeDescription: 'Increase retail loan disbursement by ₹500Cr per quarter through faster processing.',
      targetMetric: 'Reduce loan processing TAT from 7 days to 24 hours',
      expectedGoLiveDate: d('2026-11-30'),
      currentStage: 'BRD',
      stageStartDate: d('2026-06-12'),
      stageExpectedDate: d('2026-07-20'),
      lastUpdated: d('2026-06-15'),
      notes: 'BRD workshop completed. Document under review.',
      delayed: false,
      history: [
        { stage: 'BRD', date: d('2026-06-12'), user: 'Anita Desai', note: 'BRD workshop conducted' },
      ],
    },
    {
      title: 'Trade Finance Digitisation',
      type: 'PROJECT',
      verticalHeadName: 'Amit Patel',
      businessSpoc: 'Rakesh Joshi',
      businessSponsor: 'Sunil Agarwal',
      description: 'Digitize LC issuance, bill discounting, and bank guarantee processes on a blockchain platform.',
      benefitCategory: 'EFFICIENCY',
      outcomeDescription: 'Reduce trade finance processing time from 5 days to same day.',
      targetMetric: 'Reduce LC processing TAT by 80%',
      expectedGoLiveDate: d('2026-10-31'),
      currentStage: 'COMMERCIAL',
      stageStartDate: d('2026-05-20'),
      stageExpectedDate: d('2026-07-05'),
      lastUpdated: d('2026-06-05'),
      notes: 'Vendor evaluation ongoing. Awaiting business sign-off on commercials.',
      delayed: true,
      delaySource: 'BUSINESS',
      history: [
        { stage: 'BRD', date: d('2026-04-01'), user: 'Anita Desai', note: 'BRD approved' },
        { stage: 'FSD', date: d('2026-05-01'), user: 'Anita Desai', note: 'FSD approved' },
        { stage: 'COMMERCIAL', date: d('2026-05-20'), user: 'Amit Patel', note: 'RFP floated to 3 vendors' },
      ],
    },
    {
      title: 'Customer 360 Dashboard',
      type: 'PROJECT',
      verticalHeadName: 'Sunita Verma',
      businessSpoc: 'Suman Bose',
      businessSponsor: 'Geeta Krishnan',
      description: 'Build unified customer 360 view for relationship managers integrating all product holdings, transactions, and interactions.',
      benefitCategory: 'CUSTOMER_EXPERIENCE',
      outcomeDescription: 'Improve relationship manager productivity by 35% and increase cross-sell ratio by 20%.',
      targetMetric: 'Increase cross-sell ratio by 20%',
      expectedGoLiveDate: d('2026-07-31'),
      currentStage: 'APPSEC',
      stageStartDate: d('2026-06-05'),
      stageExpectedDate: d('2026-06-27'),
      lastUpdated: d('2026-06-14'),
      notes: 'AppSec scanning in progress. 2 medium findings to be addressed.',
      delayed: false,
      history: [
        { stage: 'BRD', date: d('2026-02-01'), user: 'Anita Desai', note: 'BRD approved' },
        { stage: 'FSD', date: d('2026-03-01'), user: 'Anita Desai', note: 'FSD approved' },
        { stage: 'COMMERCIAL', date: d('2026-03-20'), user: 'Anita Desai', note: 'In-house build approved' },
        { stage: 'DEVELOPMENT', date: d('2026-04-01'), user: 'Sunita Verma', note: 'Dev started' },
        { stage: 'SIT', date: d('2026-05-15'), user: 'Sunita Verma', note: 'SIT passed' },
        { stage: 'UAT', date: d('2026-06-01'), user: 'Sunita Verma', note: 'UAT signed off' },
        { stage: 'APPSEC', date: d('2026-06-05'), user: 'Sunita Verma', note: 'AppSec scan initiated' },
      ],
    },
    {
      title: 'SWIFT Message Automation',
      type: 'CHANGE_REQUEST',
      verticalHeadName: 'Vikram Singh',
      businessSpoc: 'Priti Sharma',
      businessSponsor: 'Arvind Nair',
      description: 'Automate SWIFT MT message processing and reconciliation for correspondent banking operations.',
      benefitCategory: 'EFFICIENCY',
      outcomeDescription: 'Eliminate 80% manual effort in SWIFT message processing saving 500 man-hours per month.',
      targetMetric: 'Reduce manual processing effort by 80%',
      expectedGoLiveDate: d('2026-08-31'),
      currentStage: 'SIT',
      stageStartDate: d('2026-06-08'),
      stageExpectedDate: d('2026-07-10'),
      lastUpdated: d('2026-06-15'),
      notes: 'SIT underway. MT103 and MT202 flows tested successfully.',
      delayed: false,
      history: [
        { stage: 'BRD', date: d('2026-04-15'), user: 'Anita Desai', note: 'BRD approved' },
        { stage: 'FSD', date: d('2026-05-01'), user: 'Anita Desai', note: 'FSD approved' },
        { stage: 'COMMERCIAL', date: d('2026-05-15'), user: 'Anita Desai', note: 'In-house development' },
        { stage: 'DEVELOPMENT', date: d('2026-05-20'), user: 'Vikram Singh', note: 'Dev complete' },
        { stage: 'SIT', date: d('2026-06-08'), user: 'Vikram Singh', note: 'SIT started' },
      ],
    },
    {
      title: 'BBPS Bill Payment Integration',
      type: 'CHANGE_REQUEST',
      verticalHeadName: 'Rajesh Kumar',
      businessSpoc: 'Anil Kumar',
      businessSponsor: 'Deepak Mehta',
      description: 'Integrate BBPS 2.0 for utility bill payments, insurance premiums, and school fee collection.',
      benefitCategory: 'REVENUE',
      outcomeDescription: 'Generate ₹3Cr revenue from transaction fees on 2M monthly bill payments.',
      targetMetric: 'Achieve 2M monthly BBPS transactions within 3 months of go-live',
      expectedGoLiveDate: d('2026-06-15'),
      currentStage: 'UAT',
      stageStartDate: d('2026-05-20'),
      stageExpectedDate: d('2026-06-05'),
      lastUpdated: d('2026-06-12'),
      notes: 'UAT defects delayed by business testing team resource constraints.',
      delayed: true,
      delaySource: 'IT',
      committedMonth: '2026-06',
      history: [
        { stage: 'BRD', date: d('2026-03-01'), user: 'Anita Desai', note: 'BRD approved' },
        { stage: 'FSD', date: d('2026-03-20'), user: 'Anita Desai', note: 'FSD approved' },
        { stage: 'COMMERCIAL', date: d('2026-04-05'), user: 'Anita Desai', note: 'PO issued to NPCI' },
        { stage: 'DEVELOPMENT', date: d('2026-04-15'), user: 'Rajesh Kumar', note: 'Dev complete' },
        { stage: 'SIT', date: d('2026-05-10'), user: 'Rajesh Kumar', note: 'SIT passed' },
        { stage: 'UAT', date: d('2026-05-20'), user: 'Rajesh Kumar', note: 'UAT started — delayed' },
      ],
    },
    {
      title: 'AML Transaction Monitoring',
      type: 'PROJECT',
      verticalHeadName: 'Priya Sharma',
      businessSpoc: 'Meena Gupta',
      businessSponsor: 'Ramesh Jain',
      description: 'Implement AI-powered AML transaction monitoring system to replace legacy rule-based engine.',
      benefitCategory: 'RISK_REDUCTION',
      outcomeDescription: 'Reduce false positive AML alerts by 70% and improve suspicious transaction detection by 40%.',
      targetMetric: 'Reduce AML false positives from 92% to 30%',
      expectedGoLiveDate: d('2026-11-30'),
      currentStage: 'DEVELOPMENT',
      stageStartDate: d('2026-06-01'),
      stageExpectedDate: d('2026-08-15'),
      lastUpdated: d('2026-06-14'),
      notes: 'ML model training underway on 3 years of transaction data.',
      delayed: false,
      history: [
        { stage: 'BRD', date: d('2026-03-01'), user: 'Anita Desai', note: 'BRD approved' },
        { stage: 'FSD', date: d('2026-04-01'), user: 'Anita Desai', note: 'FSD approved' },
        { stage: 'COMMERCIAL', date: d('2026-05-01'), user: 'Anita Desai', note: 'AI vendor contracted' },
        { stage: 'DEVELOPMENT', date: d('2026-06-01'), user: 'Priya Sharma', note: 'Model training started' },
      ],
    },
    {
      title: 'Digital Onboarding Revamp',
      type: 'PROJECT',
      verticalHeadName: 'Amit Patel',
      businessSpoc: 'Rakesh Joshi',
      businessSponsor: 'Sunil Agarwal',
      description: 'Revamp end-to-end digital account opening journey with e-KYC, e-sign, and instant account activation.',
      benefitCategory: 'CUSTOMER_EXPERIENCE',
      outcomeDescription: 'Reduce account opening TAT from 3 days to 15 minutes.',
      targetMetric: 'Reduce onboarding TAT to under 15 minutes',
      expectedGoLiveDate: d('2026-06-22'),
      currentStage: 'GO_LIVE',
      stageStartDate: d('2026-06-12'),
      stageExpectedDate: d('2026-06-22'),
      lastUpdated: d('2026-06-15'),
      notes: 'Production deployment planned for June 22. DR drill completed.',
      delayed: false,
      committedMonth: '2026-06',
      history: [
        { stage: 'BRD', date: d('2026-01-10'), user: 'Anita Desai', note: 'BRD approved' },
        { stage: 'FSD', date: d('2026-02-01'), user: 'Anita Desai', note: 'FSD approved' },
        { stage: 'COMMERCIAL', date: d('2026-02-20'), user: 'Anita Desai', note: 'In-house development' },
        { stage: 'DEVELOPMENT', date: d('2026-03-01'), user: 'Amit Patel', note: 'Dev complete' },
        { stage: 'SIT', date: d('2026-04-01'), user: 'Amit Patel', note: 'SIT passed' },
        { stage: 'UAT', date: d('2026-05-01'), user: 'Amit Patel', note: 'UAT signed off' },
        { stage: 'APPSEC', date: d('2026-05-20'), user: 'Amit Patel', note: 'AppSec cleared' },
        { stage: 'CAB_APPROVAL', date: d('2026-06-01'), user: 'Amit Patel', note: 'CAB approved' },
        { stage: 'GO_LIVE', date: d('2026-06-12'), user: 'Amit Patel', note: 'Deployment prep started' },
      ],
    },
    {
      title: 'Debit Card Management System',
      type: 'CHANGE_REQUEST',
      verticalHeadName: 'Sunita Verma',
      businessSpoc: 'Suman Bose',
      businessSponsor: 'Geeta Krishnan',
      description: 'Implement self-service debit card management — hotlisting, limit changes, PIN generation via app.',
      benefitCategory: 'CUSTOMER_EXPERIENCE',
      outcomeDescription: 'Reduce call center volume by 30% for card-related queries.',
      targetMetric: 'Reduce card-related call center calls by 30%',
      expectedGoLiveDate: d('2026-06-10'),
      currentStage: 'BUSINESS_VALIDATION',
      stageStartDate: d('2026-06-14'),
      stageExpectedDate: d('2026-06-20'),
      lastUpdated: d('2026-06-15'),
      notes: 'Awaiting business validation from SPOC team.',
      delayed: false,
      committedMonth: '2026-06',
      history: [
        { stage: 'BRD', date: d('2026-02-15'), user: 'Anita Desai', note: 'BRD approved' },
        { stage: 'FSD', date: d('2026-03-05'), user: 'Anita Desai', note: 'FSD approved' },
        { stage: 'COMMERCIAL', date: d('2026-03-20'), user: 'Anita Desai', note: 'In-house development' },
        { stage: 'DEVELOPMENT', date: d('2026-04-01'), user: 'Sunita Verma', note: 'Dev complete' },
        { stage: 'SIT', date: d('2026-04-25'), user: 'Sunita Verma', note: 'SIT passed' },
        { stage: 'UAT', date: d('2026-05-15'), user: 'Sunita Verma', note: 'UAT signed off' },
        { stage: 'APPSEC', date: d('2026-05-28'), user: 'Sunita Verma', note: 'AppSec cleared' },
        { stage: 'CAB_APPROVAL', date: d('2026-06-01'), user: 'Sunita Verma', note: 'CAB approved' },
        { stage: 'GO_LIVE', date: d('2026-06-10'), user: 'Sunita Verma', note: 'Successfully deployed to production' },
        { stage: 'BUSINESS_VALIDATION', date: d('2026-06-14'), user: 'Sunita Verma', note: 'Moved to business validation' },
      ],
    },
    {
      title: 'Forex Rate Feed Integration',
      type: 'CHANGE_REQUEST',
      verticalHeadName: 'Vikram Singh',
      businessSpoc: 'Priti Sharma',
      businessSponsor: 'Arvind Nair',
      description: 'Integrate real-time forex rate feed from Bloomberg for treasury and retail FX transactions.',
      benefitCategory: 'RISK_REDUCTION',
      outcomeDescription: 'Reduce FX exposure risk by real-time hedging with live market rates.',
      targetMetric: 'Eliminate FX rate lag to under 5 seconds',
      expectedGoLiveDate: d('2026-09-30'),
      currentStage: 'FSD',
      stageStartDate: d('2026-06-10'),
      stageExpectedDate: d('2026-07-25'),
      lastUpdated: d('2026-06-13'),
      notes: 'FSD in progress. Bloomberg API specification received.',
      delayed: false,
      history: [
        { stage: 'BRD', date: d('2026-05-10'), user: 'Anita Desai', note: 'BRD approved' },
        { stage: 'FSD', date: d('2026-06-10'), user: 'Vikram Singh', note: 'FSD started' },
      ],
    },
    {
      title: 'Mobile POS Merchant App',
      type: 'PROJECT',
      verticalHeadName: 'Rajesh Kumar',
      businessSpoc: 'Anil Kumar',
      businessSponsor: 'Deepak Mehta',
      description: 'Develop mobile POS application for merchant acceptance of card, UPI, and QR payments.',
      benefitCategory: 'REVENUE',
      outcomeDescription: 'Onboard 10,000 new merchants generating ₹8Cr annual fee revenue.',
      targetMetric: 'Onboard 10,000 merchants within 6 months',
      expectedGoLiveDate: d('2026-05-31'),
      currentStage: 'CLOSED',
      stageStartDate: d('2026-05-25'),
      stageExpectedDate: d('2026-05-31'),
      lastUpdated: d('2026-06-01'),
      notes: 'Successfully delivered. 2,500 merchants onboarded in first 2 weeks.',
      delayed: false,
      committedMonth: '2026-05',
      validation: {
        outcomeAchieved: 'YES',
        actualResult: 'App launched on time. 2,500 merchants onboarded in first 2 weeks. Payment acceptance working smoothly.',
        actualMetric: '2,500 merchants onboarded (target: 10,000 in 6 months — on track)',
      },
      history: [
        { stage: 'BRD', date: d('2025-11-01'), user: 'Anita Desai', note: 'BRD approved' },
        { stage: 'FSD', date: d('2025-12-01'), user: 'Anita Desai', note: 'FSD approved' },
        { stage: 'COMMERCIAL', date: d('2025-12-20'), user: 'Anita Desai', note: 'Vendor contracted' },
        { stage: 'DEVELOPMENT', date: d('2026-02-01'), user: 'Rajesh Kumar', note: 'Dev started' },
        { stage: 'SIT', date: d('2026-03-15'), user: 'Rajesh Kumar', note: 'SIT passed' },
        { stage: 'UAT', date: d('2026-04-10'), user: 'Rajesh Kumar', note: 'UAT signed off' },
        { stage: 'APPSEC', date: d('2026-04-25'), user: 'Rajesh Kumar', note: 'AppSec cleared' },
        { stage: 'CAB_APPROVAL', date: d('2026-05-01'), user: 'Rajesh Kumar', note: 'CAB approved' },
        { stage: 'GO_LIVE', date: d('2026-05-20'), user: 'Rajesh Kumar', note: 'Deployed to production' },
        { stage: 'BUSINESS_VALIDATION', date: d('2026-05-25'), user: 'Anil Kumar', note: 'Business validation completed' },
        { stage: 'CLOSED', date: d('2026-06-01'), user: 'Anita Desai', note: 'Item closed successfully' },
      ],
    },
    {
      title: 'Loan Account Statement API',
      type: 'CHANGE_REQUEST',
      verticalHeadName: 'Priya Sharma',
      businessSpoc: 'Meena Gupta',
      businessSponsor: 'Ramesh Jain',
      description: 'Expose loan account statement via API for AA (Account Aggregator) framework integration.',
      benefitCategory: 'COMPLIANCE',
      outcomeDescription: 'Achieve RBI AA framework compliance and enable customer data portability.',
      targetMetric: 'AA framework compliance by RBI deadline',
      expectedGoLiveDate: d('2026-08-31'),
      currentStage: 'COMMERCIAL',
      stageStartDate: d('2026-05-25'),
      stageExpectedDate: d('2026-06-08'),
      lastUpdated: d('2026-06-13'),
      notes: 'Commercial negotiations delayed due to AA aggregator pricing dispute.',
      delayed: true,
      delaySource: 'EXTERNAL',
      history: [
        { stage: 'BRD', date: d('2026-04-20'), user: 'Anita Desai', note: 'BRD approved' },
        { stage: 'FSD', date: d('2026-05-10'), user: 'Anita Desai', note: 'FSD approved' },
        { stage: 'COMMERCIAL', date: d('2026-05-25'), user: 'Priya Sharma', note: 'Vendor negotiations started' },
      ],
    },
    {
      title: 'Treasury Management System Upgrade',
      type: 'PROJECT',
      verticalHeadName: 'Amit Patel',
      businessSpoc: 'Rakesh Joshi',
      businessSponsor: 'Sunil Agarwal',
      description: 'Upgrade TMS to support ALM, liquidity management, and real-time position monitoring.',
      benefitCategory: 'RISK_REDUCTION',
      outcomeDescription: 'Reduce treasury operational risk and achieve Basel III liquidity reporting compliance.',
      targetMetric: 'Achieve 100% Basel III LCR compliance by Dec 2026',
      expectedGoLiveDate: d('2026-10-31'),
      currentStage: 'SIT',
      stageStartDate: d('2026-06-08'),
      stageExpectedDate: d('2026-07-05'),
      lastUpdated: d('2026-06-15'),
      notes: 'SIT in progress. ALM module testing underway.',
      delayed: false,
      history: [
        { stage: 'BRD', date: d('2026-02-15'), user: 'Anita Desai', note: 'BRD approved' },
        { stage: 'FSD', date: d('2026-03-15'), user: 'Anita Desai', note: 'FSD approved' },
        { stage: 'COMMERCIAL', date: d('2026-04-01'), user: 'Anita Desai', note: 'Vendor contracted' },
        { stage: 'DEVELOPMENT', date: d('2026-05-01'), user: 'Amit Patel', note: 'Dev started' },
        { stage: 'SIT', date: d('2026-06-08'), user: 'Amit Patel', note: 'SIT commenced' },
      ],
    },
    {
      title: 'Customer Grievance Portal',
      type: 'PROJECT',
      verticalHeadName: 'Sunita Verma',
      businessSpoc: 'Suman Bose',
      businessSponsor: 'Geeta Krishnan',
      description: 'Build integrated customer grievance portal with auto-routing, SLA tracking, and RBI reporting.',
      benefitCategory: 'COMPLIANCE',
      outcomeDescription: 'Reduce grievance TAT from 30 days to 7 days and achieve 100% RBI TAT compliance.',
      targetMetric: 'Reduce grievance resolution TAT by 77%',
      expectedGoLiveDate: d('2026-10-31'),
      currentStage: 'BRD',
      stageStartDate: d('2026-06-08'),
      stageExpectedDate: d('2026-06-26'),
      lastUpdated: d('2026-06-14'),
      notes: 'BRD in progress. Legal and compliance inputs pending.',
      delayed: false,
      history: [
        { stage: 'BRD', date: d('2026-06-08'), user: 'Anita Desai', note: 'BRD initiated' },
      ],
    },
    {
      title: 'IMPS Real-time Settlement Upgrade',
      type: 'CHANGE_REQUEST',
      verticalHeadName: 'Vikram Singh',
      businessSpoc: 'Priti Sharma',
      businessSponsor: 'Arvind Nair',
      description: 'Upgrade IMPS infrastructure to handle 10x volume growth and achieve 99.99% uptime per NPCI SLA.',
      benefitCategory: 'EFFICIENCY',
      outcomeDescription: 'Support ₹50,000Cr daily IMPS settlement with zero downtime.',
      targetMetric: 'Achieve 99.99% IMPS uptime and 10x throughput',
      expectedGoLiveDate: d('2026-07-31'),
      currentStage: 'CAB_APPROVAL',
      stageStartDate: d('2026-05-30'),
      stageExpectedDate: d('2026-07-01'),
      lastUpdated: d('2026-06-04'),
      notes: 'No update received from team. Escalation required.',
      delayed: false,
      history: [
        { stage: 'BRD', date: d('2026-03-01'), user: 'Anita Desai', note: 'BRD approved' },
        { stage: 'FSD', date: d('2026-04-01'), user: 'Anita Desai', note: 'FSD approved' },
        { stage: 'COMMERCIAL', date: d('2026-04-20'), user: 'Anita Desai', note: 'Infrastructure vendor selected' },
        { stage: 'DEVELOPMENT', date: d('2026-05-01'), user: 'Vikram Singh', note: 'Dev complete' },
        { stage: 'SIT', date: d('2026-05-15'), user: 'Vikram Singh', note: 'SIT passed' },
        { stage: 'UAT', date: d('2026-05-25'), user: 'Vikram Singh', note: 'UAT cleared' },
        { stage: 'APPSEC', date: d('2026-05-28'), user: 'Vikram Singh', note: 'AppSec cleared' },
        { stage: 'CAB_APPROVAL', date: d('2026-05-30'), user: 'Vikram Singh', note: 'Submitted to CAB — no update since' },
      ],
    },
  ];

  let count = 0;
  for (const seed of initiatives) {
    const existing = await prisma.initiative.findFirst({ where: { title: seed.title } });
    if (existing) {
      await prisma.initiative.delete({ where: { id: existing.id } });
    }

    const initiative = await prisma.initiative.create({
      data: {
        title: seed.title,
        type: seed.type,
        methodology: 'WATERFALL',
        verticalHeadName: seed.verticalHeadName,
        businessSpoc: seed.businessSpoc,
        businessSponsor: seed.businessSponsor,
        description: seed.description,
        benefitCategory: seed.benefitCategory,
        outcomeDescription: seed.outcomeDescription,
        targetMetric: seed.targetMetric,
        expectedGoLiveDate: seed.expectedGoLiveDate,
        currentStage: seed.currentStage,
        currentProcessGroup: STAGE_TO_PG[seed.currentStage],
        stageStartDate: seed.stageStartDate,
        stageExpectedDate: seed.stageExpectedDate,
        lastUpdated: seed.lastUpdated,
        notes: seed.notes,
        delayed: seed.delayed,
        delaySource: seed.delaySource ?? null,
        committedMonth: seed.committedMonth ?? null,
      },
    });

    // Waterfall stage records
    for (const h of seed.history) {
      const isLastHistory = h === seed.history[seed.history.length - 1];
      await prisma.waterfallStage.upsert({
        where: { initiativeId_stage: { initiativeId: initiative.id, stage: h.stage } },
        update: {},
        create: {
          initiativeId: initiative.id,
          stage: h.stage,
          processGroup: STAGE_TO_PG[h.stage],
          expectedDate: seed.currentStage === h.stage ? seed.stageExpectedDate : new Date(h.date.getTime() + 14 * 86400000),
          startedDate: h.date,
          completedDate: isLastHistory && seed.currentStage !== h.stage ? h.date : null,
        },
      });
    }

    // History log
    for (const h of seed.history) {
      await prisma.historyLog.create({
        data: {
          initiativeId: initiative.id,
          stage: h.stage,
          note: h.note,
          userName: h.user,
          createdAt: h.date,
        },
      });
    }

    // Business validation
    if (seed.validation) {
      await prisma.businessValueRealization.create({
        data: {
          initiativeId: initiative.id,
          outcomeAchieved: seed.validation.outcomeAchieved,
          actualResult: seed.validation.actualResult,
          actualMetric: seed.validation.actualMetric,
        },
      });
    }

    count++;
  }

  console.log(`Seeded ${count} initiatives`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
