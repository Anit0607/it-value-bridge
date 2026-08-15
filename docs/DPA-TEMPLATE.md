# Data Processing Agreement — Template

> **⚠️ DRAFT — NOT LEGAL ADVICE.**
>
> This is a starting point prepared by the engineering side so that commercial
> discussions do not stall on a blank page. It has **not** been reviewed by a
> lawyer. Do not sign it, and do not send it to a bank's legal team as a final
> document, without qualified review under Indian law (DPDP Act 2023) and any
> other jurisdiction that applies.
>
> Square brackets mark values that must be filled in before use.

---

**This Data Processing Agreement ("DPA")** forms part of the agreement between:

- **[VENDOR LEGAL ENTITY NAME]**, [registered address], ("**Processor**")
- **[CUSTOMER LEGAL ENTITY NAME]**, [registered address], ("**Controller**")

Effective from **[DATE]**.

---

## 1. Definitions

Terms including *Personal Data*, *Processing*, *Data Principal*, *Data
Fiduciary* and *Data Processor* carry the meanings given in the Digital Personal
Data Protection Act, 2023 (India). Where the Controller is subject to another
data protection regime, equivalent terms apply.

---

## 2. Subject matter and roles

2.1 The Controller is the Data Fiduciary in respect of all Personal Data
processed under the Agreement. The Processor acts solely as a Data Processor.

2.2 **Deployment model.** The Software is deployed **on the Controller's own
infrastructure, within the Controller's own network**. In this configuration:

  (a) The Processor does **not** host, store, receive, transmit or retain any
      Personal Data belonging to the Controller;
  (b) The Processor has **no technical access path** to any production instance;
  (c) The Software makes **no outbound network connection** to the Processor or
      to any third party during normal operation.

2.3 The parties acknowledge that clause 2.2 materially limits the Processor's
practical ability to process Personal Data, and that several obligations in this
DPA apply only in the circumstances described in clause 6 (Support Access).

---

## 3. Nature and purpose of processing

| | |
|---|---|
| **Purpose** | Enabling the Controller to plan, govern and report on its own IT investment portfolio |
| **Duration** | The term of the Agreement |
| **Nature** | Storage, retrieval, display and computation performed **by the Software on the Controller's infrastructure** |

### Categories of Data Principal

- The Controller's own employees and contractors who are users of the Software
- Named individuals recorded as owners, sponsors or points of contact for
  initiatives

### Categories of Personal Data

- Name, work email address, assigned role and organisational unit
- Authentication credentials in the form of bcrypt password hashes and, where
  the user has enrolled, a TOTP secret and hashed recovery codes
- Records of actions taken in the Software (approvals, sign-offs, edits) with
  the acting user's name and a timestamp

### Special category / sensitive Personal Data

**None.** The Software is not designed to process financial account data,
payment data, government identifiers, health data, biometric data, or data
relating to the Controller's own customers. The Controller shall not enter such
data into free-text fields.

---

## 4. Processor obligations

The Processor shall:

4.1 Process Personal Data only on the Controller's documented instructions;

4.2 Ensure that personnel authorised to process Personal Data are bound by
confidentiality;

4.3 Implement the technical and organisational measures described in
**Annex A**;

4.4 Assist the Controller, at the Controller's cost and so far as the Processor
is technically able, with Data Principal rights requests, security incident
notification, and data protection impact assessments — noting that in the
deployment model at clause 2.2 the Controller has direct and exclusive access to
its own data and will ordinarily require no such assistance;

4.5 Notify the Controller **without undue delay and in any event within
[24 / 48 / 72] hours** of becoming aware of a Personal Data Breach affecting
Personal Data processed by the Processor;

4.6 Notify the Controller without undue delay upon becoming aware of a security
vulnerability in the Software that is reasonably likely to affect the
confidentiality, integrity or availability of Personal Data, together with
available mitigation;

4.7 At the Controller's election on termination, delete or return any Personal
Data in the Processor's possession — noting that under clause 2.2 the Processor
ordinarily holds none.

---

## 5. Sub-processors

5.1 **The Processor engages no sub-processors** in respect of on-prem
deployments. The Software has no runtime dependency on any third-party service.

5.2 The Processor shall give the Controller **[30] days'** prior written notice
before engaging any sub-processor, and the Controller may object on reasonable
data protection grounds.

5.3 Any list of sub-processors shall be maintained at **[URL / on request]**.

---

## 6. Support access

6.1 The Processor requires **no standing access** to the Controller's
environment.

6.2 Where the Controller requests support that requires access to a production
instance or to data extracted from one, such access shall be:

  (a) requested and approved in writing on each occasion;
  (b) limited to the minimum scope and duration necessary;
  (c) logged by the Controller;
  (d) provided from anonymised or redacted data where practicable.

6.3 Diagnostic material voluntarily supplied by the Controller (for example log
extracts or database dumps) is Personal Data for as long as the Processor holds
it, and shall be deleted within **[30] days** of the support matter closing.

---

## 7. International transfers

No transfer of Personal Data outside India occurs in the deployment model at
clause 2.2. Should any transfer arise under clause 6, it shall take place only
with the Controller's prior written consent and subject to a lawful transfer
mechanism.

---

## 8. Audit

8.1 The Processor shall make available information reasonably necessary to
demonstrate compliance with this DPA, including its current security
questionnaire response.

8.2 The Controller may audit the Processor **[once per twelve months]**, on
**[30]** days' notice, during business hours, at the Controller's cost, subject
to reasonable confidentiality undertakings.

8.3 [**To be negotiated:** independent penetration test reports and source code
escrow arrangements.]

---

## 9. Liability

Liability under this DPA is governed by the limitation and exclusion provisions
of the Agreement. [**Flag for counsel:** banks commonly require data protection
liability to be carved out of the general cap. Do not agree to an uncapped
carve-out without confirming that cyber liability insurance is in force and
adequate.]

---

## 10. Governing law

This DPA is governed by the laws of India, and the courts of **[CITY]** shall
have exclusive jurisdiction.

---

# Annex A — Technical and organisational measures

Accurate as at **2026-08-15**. Full detail, including known gaps, is in
`docs/SECURITY-QUESTIONNAIRE.md`. **The gaps listed there are part of this
disclosure and are not to be omitted when this Annex is shared.**

| Area | Measure |
|---|---|
| Access control | Role-based; organisation and role scoping applied through a single enforcement point; server-side authorisation on privileged actions |
| Separation of duties | Value sign-offs and cost changes above a configurable materiality threshold require a second, different approver; enforced server-side |
| Authentication | bcrypt password hashing (cost 12); optional TOTP second factor implemented to RFC 6238 and verified against the specification's published test vectors; single-use hashed recovery codes |
| Auditability | Actor-and-timestamp trail for stage changes, cost changes, approvals and restatements; signed-off figures lock and can only be changed by a recorded restatement |
| Logging | Structured JSON to stdout with automatic redaction of credentials, email addresses and business financial values; no external log destination |
| Data minimisation | No customer-of-customer data, no payment data, no special category data processed |
| Network posture | No outbound connections at runtime; no telemetry; no third-party runtime services |
| Image security | Non-root container (uid 1001); security updates applied at build; Trivy scan gating CI on fixable HIGH/CRITICAL findings |
| Change management | CI enforcing typecheck, lint, automated tests and a production build on every change |
| Availability | Readiness endpoint verifying database reachability; documented and **tested** backup/restore procedure |
| Environment separation | `APP_ENV` gates a visible non-production marker and blocks destructive operations in production |

**Measures NOT in place** (see `docs/SECURITY-QUESTIONNAIRE.md` §8 for the full
list): SSO/SAML, organisation-wide MFA enforcement, application-level account
lockout, database-enforced append-only audit storage, completed VAPT, defined
RTO/RPO, and high availability.

---

**Signed for and on behalf of the Controller** — Name / Title / Date / Signature

**Signed for and on behalf of the Processor** — Name / Title / Date / Signature
