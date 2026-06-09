"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function TermsAndConditions() {
  const [content, setContent] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("June 9, 2026");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const snap = await getDoc(doc(db, "platformSettings", "legal"));
        if (snap.exists() && snap.data().termsAndConditions) {
          const fetchedContent = snap.data().termsAndConditions;
          const isHtml = (str: string) => str.includes("<h1") || str.includes("<section");
          
          if (!isHtml(fetchedContent)) {
            setContent(fetchedContent);
          }
          
          if (snap.data().updatedAt) {
            setLastUpdated(new Date(snap.data().updatedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch custom terms and conditions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTerms();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto px-6 bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
        <Link href="/" className="text-brand-primary hover:text-brand-secondary font-bold text-sm mb-8 inline-block">
          &larr; Back to Home
        </Link>
        <h1 className="text-4xl font-extrabold text-brand-primary mb-2">Terms & Conditions</h1>
        <p className="text-sm text-gray-500 mb-8 font-medium">Last Updated: {lastUpdated}</p>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        ) : content ? (
          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed font-medium">
            {content}
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed font-medium">
{`1. Acceptance of Terms
Users agree to these terms by using the Cloud Ledger platform.

2. Account Registration
- Accurate information is required for registration.
- Users are responsible for maintaining account credentials.
- Account sharing is strictly prohibited.

3. Subscription & Billing
- Pricing plans are subject to change.
- Renewal processes are automated unless canceled.
- Payment terms apply as specified at checkout.
- Subscription cancellation must be done before the next billing cycle.

4. User Responsibilities
- Accuracy of business records and invoices.
- Tax and GST compliance.
- Maintaining account security.

5. Acceptable Use
Users may use the platform for:
- Billing, Invoicing, and Inventory management
- Accounting records and Business operations

Prohibited Activities include:
- Illegal activities or Unauthorized access attempts
- Reverse engineering or Data scraping
- Platform abuse or Uploading malicious content

6. Data Ownership & Intellectual Property
- Users own all business data entered into the platform.
- Cloud Ledger owns the software, design, branding, and source code.
- Intellectual Property includes Cloud Ledger name, logo, UI designs, software code, and documentation.

7. Third-Party Integrations & Service Availability
- Integrations include Payment gateway, SMS services, Email services, and Other APIs.
- Service may be affected by maintenance windows and temporary downtime.
- We do not guarantee 100% uninterrupted service.

8. Limitation of Liability
Cloud Ledger is not responsible for:
- Incorrect user-entered data
- Tax filing errors
- Business losses
- Third-party service failures

9. Account Suspension & Termination
We reserve the right to suspend or terminate accounts for:
- Violation of terms
- Fraudulent activities
- Non-payment of subscriptions

10. Refund Policy
Subscriptions are generally non-refundable unless legally required or specifically outlined in your pricing plan terms.

11. Governing Law & Changes
These terms are governed by the laws of India. Jurisdiction to be specified by the company in Mumbai, India.
We may update these terms periodically. Continued use of the platform implies acceptance of updated terms.

IMPORTANT DISCLAIMERS

GST Disclaimer
Cloud Ledger provides tools for billing and tax calculations. Users are solely responsible for ensuring compliance with applicable tax laws and regulations.

Invoice Accuracy Disclaimer
Users are responsible for verifying invoice details before sharing or printing.

Data Backup Disclaimer
While Cloud Ledger maintains backups, users are encouraged to retain copies of critical business records.

Payment Gateway Disclaimer
Cloud Ledger is not responsible for failures, delays, or errors caused by third-party payment providers.

SMS / Email Delivery Disclaimer
Delivery of notifications depends on third-party providers and cannot be guaranteed.

SaaS Service Disclaimer
Service availability may be affected by maintenance, updates, infrastructure issues, or circumstances beyond our control.

Non-Affiliation Clause
Cloud Ledger is an independently developed software platform. Any similarity in features, workflows, or business processes to other billing, accounting, inventory, or business management software is based on common industry practices and does not imply any affiliation, endorsement, sponsorship, or association with any third-party product or service.

Contact Information
- Support Email: support@cloudledger.com
- Company Address: Cloud Ledger HQ, Mumbai, India
- Contact Details: +91 88911 77850`}
          </div>
        )}
      </div>
    </div>
  );
}
