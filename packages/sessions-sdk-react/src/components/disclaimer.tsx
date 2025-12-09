import clsx from "clsx";
import type { ComponentProps } from "react";

import styles from "./disclaimer.module.scss";

export const Disclaimer = ({ className, ...props }: ComponentProps<"div">) => (
  <div className={clsx(className, styles.disclaimer)} {...props}>
    <p>
      The Fogo1 Foundation (“<b>Fogo Foundation</b>”) has made available the
      Fogo Sessions wallet integration tools and connection interface (including
      connection flows, adapters, libraries, UI components, and any embedded or
      downloadable code, collectively the “<b>Integration Tools</b>”). The
      Integration Tools may enable a web-based application to route user-signed
      transactions or user operations to a third-party gas sponsor or paymaster
      (as that term is commonly used in account-abstraction architectures such
      as EIP-4337) (“<b>Sponsor</b>”). By using or interacting with the
      Integration Tools—whether as an application, developer, Sponsor, or an
      end-user—you acknowledge and agree to the following:
    </p>
    <ol>
      <li>
        <h2>Non-Custodial; No Control Over Wallets or Assets; No Routing</h2>
        <p>
          The Integration Tools are non-custodial. The Integration Tools may
          facilitate client-side signing using a user-authorized,
          application-specific session key that remains on the user’s
          device/application. The Integration Tools never extract or provide a
          third party with access to any private keys.
        </p>
        <div>
          <p>Fogo Sessions does not:</p>
          <ul>
            <li>
              does not receive, store, or access users’ wallet private keys,
              seed phrases, accounts, or digital assets;
            </li>
            <li>
              does not access, sign transactions with or control users’ wallet
              private keys;
            </li>
            <li>
              act as an agent, broker, intermediary, or fiduciary for any user,
              wallet, Sponsor, or application;
            </li>
            <li>
              control any wallet, dApp, chain, smart-contract, RPC node, or
              network; or
            </li>
            <li>
              mediate or supervise interactions between users and wallets.
            </li>
          </ul>
        </div>
        <p>
          Any session keys are generated and stored locally by the implementing
          application or user device and are never transmitted to Fogo
          Foundation. All signing operations using the Integration Tools occur
          entirely within the user’s device. The user device then submits the
          signed transaction to the Sponsor for broadcast to the blockchain.
        </p>
        <p>
          Any submission of signed payloads occurs directly from the user device
          (client) to third-party Sponsor endpoints. Fogo Foundation does not
          host, proxy, receive, relay, receive, or forward signed payloads. The
          Integration Tools do not operate or control any Sponsor, bundler, or
          application entry point.
        </p>
      </li>
      <li>
        <h2>No Endorsement or Control of Third-Party Software or Services</h2>
        <p>
          The Integration Tools facilitate application-to-wallet and, where
          enabled, client-side construction and signing of payloads using a
          user-authorized session key, and client-initiated submission of such
          payloads to Sponsor endpoints designated by the implementer. Gas
          sponsorship may be provided by the application or a third-party
          paymaster—not by Fogo Foundation. Fogo Foundation does not sponsor
          transactions, operate a paymaster, or assume responsibility for gas
          costs. Transaction execution is not guaranteed and may fail even if
          sponsorship is offered. Fees, gas prices, and sponsorship terms are
          set by third parties and may change without notice.
        </p>
        <div>
          <p>Fogo Foundation does not:</p>
          <ul>
            <li>operate, audit, or endorse any wallet or application;</li>
            <li>
              guarantee the functionality, security, or reliability of any
              wallet or application;
            </li>
            <li>authorize, approve, or reject transactions;</li>
            <li>commit to sponsor gas for any user or application; or</li>
            <li>
              verify the legitimacy, safety, or trustworthiness of any wallet or
              application implementing the Integration Tools.
            </li>
          </ul>
        </div>
        <p>
          Users and developers must independently evaluate any application,
          Sponsor, or other third party tool or service they choose to interact
          with.
        </p>
      </li>
      <li>
        <h2>“AS IS” and “AS AVAILABLE” — No Warranties</h2>
        <p>
          THE INTEGRATION TOOLS AND ANY RELATED USER INTERFACES ARE PROVIDED “AS
          IS” AND “AS AVAILABLE” TO THE FULLEST EXTENT PERMITTED BY APPLICABLE
          LAW, WITHOUT ANY WARRANTIES, EXPRESS, IMPLIED, OR STATUTORY (AND
          NOTHING HEREIN AFFECTS NON-EXCLUDABLE RIGHTS).
        </p>
        <div>
          <p>This includes disclaiming all implied warranties of:</p>
          <ul>
            <li>
              merchantability, fitness for a particular purpose, and title;
            </li>
            <li>non-infringement;</li>
            <li>accuracy, reliability, availability, or security; and</li>
            <li>compatibility with any wallet, device, browser, or network.</li>
          </ul>
        </div>
        <p>
          No communication (written or otherwise) from Fogo Foundation creates
          any warranty unless explicitly stated in a signed written agreement.
          You are solely responsible for your use of the Integration Tools, and
          you assume all risks arising from or relating to that use.
        </p>
      </li>
      <li>
        <h2>Blockchain, Transaction, and Smart-Contract Risks</h2>
        <div>
          <p>
            Blockchain networks and digital assets involve inherent risks,
            including (but not limited to):
          </p>
          <ul>
            <li>irreversible loss of digital assets;</li>
            <li>failed, stuck, or mis-priced transactions;</li>
            <li>smart-contract bugs or vulnerabilities;</li>
            <li>malicious activity, phishing, or UI spoofing;</li>
            <li>
              chain reorganizations, validator behavior, or MEV extraction;
            </li>
            <li>RPC outages, network congestion, or forks;</li>
            <li>
              account-abstraction risks (e.g., bundler or entry-point failure,
              Sponsor misconfiguration or insolvency); and
            </li>
            <li>
              delegated-signing risks (e.g., session-key compromise or hijack,
              XSS/supply-chain attacks), mis-scoped session permissions or
              excessive token limits, replay or stale intents, and failures to
              revoke expired sessions.
            </li>
          </ul>
        </div>
        <p>
          FOGO FOUNDATION IS NOT RESPONSIBLE FOR ANY LOSSES OR DAMAGES,
          INCLUDING LOSS OF TOKENS OR DIGITAL ASSETS, ARISING FROM THESE RISKS.
        </p>
      </li>
      <li>
        <h2>Developer Responsibilities</h2>
        <div>
          <p>For developers integrating the Integration Tools:</p>
          <ul>
            <li>
              you are solely responsible for reviewing, testing, and securing
              your implementation;
            </li>
            <li>
              you must provide your own user disclosures, safeguards,
              permissions, and warnings;
            </li>
            <li>
              you must comply with all applicable laws, rules, and regulatory
              requirements;
            </li>
            <li>
              you bear all risk associated with modifications, forks, or bundled
              versions of the Integration Tools.
            </li>
          </ul>
        </div>
        <p>
          FOGO FOUNDATION is not responsible for any application built using the
          Integration Tools or any harm caused to users by such applications.
        </p>
      </li>
      <li>
        <h2>No Guarantee of Compatibility or Availability</h2>
        <div>
          <p>
            Fogo Foundation does not guarantee that the Integration Tools or
            widget will:
          </p>
          <ul>
            <li>work with every wallet, chain, or network;</li>
            <li>
              function correctly across all browsers, devices, or environments;
            </li>
            <li>remain available or unchanged;</li>
            <li>continue to support any specific wallet or provider.</li>
          </ul>
        </div>
        <p>
          Fogo Foundation may modify, discontinue, or deprecate features at any
          time may modify, discontinue, or deprecate features at any time
          without obligation to provide notice (although Fogo Foundation may
          provide notice where feasible).
        </p>
      </li>
      <li>
        <h2>Limitation of Liability</h2>
        <div>
          <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:</p>
          <ul>
            <li>
              FOGO FOUNDATION SHALL NOT BE liABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL DAMAGES;
            </li>
            <li>
              FOGO FOUNDATION SHALL NOT BE liABLE FOR ANY CLAIM OR LOSS ARISING
              FROM THE MODIFICATION OF THE INTEGRATION TOOLS BY ANY END USER,
              APPliCATOIN, OR ANY OTHER THIRD PARTY;
            </li>
            <li>
              THE FOREGOING liMITATIONS INCLUDES LOSS OF DIGITAL ASSETS, DATA,
              PROFITS, BUSINESS, OR GOODWILL;
            </li>
            <li>
              IN ALL CASES, FOGO FOUNDATION’S AGGREGATE liABIliTY FOR ANY CLAIM
              RELATING TO THE INTEGRATION TOOLS OR WIDGET SHALL NOT EXCEED USD
              0.
            </li>
          </ul>
        </div>
        <p>
          NOTHING IN THIS DISCLAIMER EXCLUDES LIABILITY THAT CANNOT BE EXCLUDED
          UNDER APPLICABLE LAW (INCLUDING FOR FRAUD). The foregoing limitations
          apply to Fogo Foundation, its affiliates, and all maintainers,
          contributors, and licensors of the Integration Tools.
        </p>
      </li>
      <li>
        <h2>No Duty to Support or Maintain</h2>
        <div>
          <p>Fogo Foundation has no obligation to provide:</p>
          <ul>
            <li>support or technical assistance,</li>
            <li>updates, bug fixes, or security patches,</li>
            <li>ongoing maintenance or compatibility improvements.</li>
          </ul>
        </div>
        <p>
          Any community support is voluntary and does not create obligations.
          Fogo Foundation does not monitor, supervise, or police unofficial
          implementations of the Integration Tools and has no duty to do so.
        </p>
      </li>
      <li>
        <h2>Open-Source License</h2>
        <p>
          The Integration Tools are licensed under the Apache License, Version
          2.0 (“<b>Apache 2.0</b>”). Apache 2.0 governs permissions to use,
          copy, modify, and distribute the software. This Disclaimer governs
          warranties, risk allocation, and limitations of liability. If there is
          any conflict between the two, Apache 2.0 governs licensing terms, and
          this Disclaimer governs risk, warranty, and liability terms.
        </p>
      </li>
      <li>
        <h2>Prohibited Conduct</h2>
        <p>
          You may not use the Integration Tools in a manner that is: (i)
          designed to deceive or defraud users, exfiltrate keys, bypass
          disclosed session-key scopes/limits/expiry, or otherwise compromise
          user security; (ii) violates sanctions/AML, data-protection, or
          consumer-protection laws; or (iii) designed to impersonate [FS] or
          misrepresent affiliation. This condition applies to your use of Fogo
          Foundation’s official code, repositories, websites, and brand and does
          not restrict independent exercise of license rights to the code
          itself.
        </p>
      </li>
      <li>
        <h2>Governing Law</h2>
        <p>
          This Disclaimer is governed by the laws of the Cayman Islands. Unless
          otherwise required by the License, any dispute shall be resolved
          exclusively in the courts of the Cayman Islands.
        </p>
      </li>
      <li>
        <h2>Severability; Updates.</h2>
        <p>
          If any term is unenforceable, the remainder remains in effect. Fogo
          Foundation may update this Disclaimer from time to time; continued use
          after an update indicates acceptance.
        </p>
      </li>
    </ol>
  </div>
);
