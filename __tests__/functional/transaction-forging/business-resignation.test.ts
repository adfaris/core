import "@packages/core-test-framework/src/matchers";

import { Contracts } from "@arkecosystem/core-kernel";
import { Identities } from "@arkecosystem/crypto";
import { generateMnemonic } from "bip39";

import { snoozeForBlock, TransactionFactory } from "@packages/core-test-framework/src/utils";
import secrets from "@packages/core-test-framework/src/internal/secrets.json";
import * as support from "./__support__";

let app: Contracts.Kernel.Application;
beforeAll(async () => (app = await support.setUp()));
afterAll(async () => await support.tearDown());

describe("Transaction Forging - Business resignation", () => {
    describe("Signed with 1 Passphrase", () => {
        it("should broadcast, accept and forge it [Signed with 1 Passphrase]", async () => {
            // Registering a business
            let businessRegistration = TransactionFactory.init(app)
                .businessRegistration({
                    name: "ark",
                    website: "ark.io",
                })
                .withPassphrase(secrets[0])
                .createOne();

            await expect(businessRegistration).toBeAccepted();
            await snoozeForBlock(1);
            await expect(businessRegistration.id).toBeForged();

            // Resigning a business
            let businessResignation = TransactionFactory.init(app)
                .businessResignation()
                .withPassphrase(secrets[0])
                .createOne();

            await expect(businessResignation).toBeAccepted();
            await snoozeForBlock(1);
            await expect(businessResignation.id).toBeForged();

            // Reject a second resignation
            businessResignation = TransactionFactory.init(app)
                .businessResignation()
                .withPassphrase(secrets[0])
                .createOne();

            await expect(businessResignation).toBeRejected();
            await snoozeForBlock(1);
            await expect(businessResignation.id).not.toBeForged();

            // Reject a new registration
            businessRegistration = TransactionFactory.init(app)
                .businessRegistration({
                    name: "ark",
                    website: "ark.io",
                })
                .withPassphrase(secrets[0])
                .createOne();

            await expect(businessRegistration).toBeRejected();
            await snoozeForBlock(1);
            await expect(businessRegistration.id).not.toBeForged();
        });
    });

    describe("Signed with 2 Passphrases", () => {
        // Prepare a fresh wallet for the tests
        const passphrase = generateMnemonic();
        const secondPassphrase = generateMnemonic();

        it("should broadcast, accept and forge it [Signed with 2 Passphrases] ", async () => {
            // Initial Funds
            const initialFunds = TransactionFactory.init(app)
                .transfer(Identities.Address.fromPassphrase(passphrase), 250 * 1e8)
                .withPassphrase(secrets[0])
                .createOne();

            await expect(initialFunds).toBeAccepted();
            await snoozeForBlock(1);
            await expect(initialFunds.id).toBeForged();

            // Register a second passphrase
            const secondSignature = TransactionFactory.init(app)
                .secondSignature(secondPassphrase)
                .withPassphrase(passphrase)
                .createOne();

            await expect(secondSignature).toBeAccepted();
            await snoozeForBlock(1);
            await expect(secondSignature.id).toBeForged();

            // Registering a business
            let businessRegistration = TransactionFactory.init(app)
                .businessRegistration({
                    name: "ark",
                    website: "ark.io",
                })
                .withPassphrase(passphrase)
                .withSecondPassphrase(secondPassphrase)
                .createOne();

            await expect(businessRegistration).toBeAccepted();
            await snoozeForBlock(1);
            await expect(businessRegistration.id).toBeForged();

            // Resigning a business
            let businessResignation = TransactionFactory.init(app)
                .businessResignation()
                .withPassphrase(passphrase)
                .withSecondPassphrase(secondPassphrase)
                .createOne();

            await expect(businessResignation).toBeAccepted();
            await snoozeForBlock(1);
            await expect(businessResignation.id).toBeForged();

            // Reject a second resignation
            businessResignation = TransactionFactory.init(app)
                .businessResignation()
                .withPassphrase(passphrase)
                .withSecondPassphrase(secondPassphrase)
                .createOne();

            await expect(businessResignation).toBeRejected();
            await snoozeForBlock(1);
            await expect(businessResignation.id).not.toBeForged();

            // Reject a new registration
            businessRegistration = TransactionFactory.init(app)
                .businessRegistration({
                    name: "ark",
                    website: "ark.io",
                })
                .withPassphrase(passphrase)
                .withSecondPassphrase(secondPassphrase)
                .createOne();

            await expect(businessRegistration).toBeRejected();
            await snoozeForBlock(1);
            await expect(businessRegistration.id).not.toBeForged();
        });
    });
    describe("Signed with multi signature [3 of 3]", () => {
        // Multi signature wallet data
        const passphrase = generateMnemonic();
        const passphrases = [passphrase, secrets[4], secrets[5]];
        const participants = [
            Identities.PublicKey.fromPassphrase(passphrases[0]),
            Identities.PublicKey.fromPassphrase(passphrases[1]),
            Identities.PublicKey.fromPassphrase(passphrases[2]),
        ];

        it("should broadcast, accept and forge it [3-of-3 multisig]", async () => {
            // Funds to register a multi signature wallet
            const initialFunds = TransactionFactory.init(app)
                .transfer(Identities.Address.fromPassphrase(passphrase), 50 * 1e8)
                .withPassphrase(secrets[0])
                .createOne();

            await expect(initialFunds).toBeAccepted();
            await snoozeForBlock(1);
            await expect(initialFunds.id).toBeForged();

            // Registering a multi-signature wallet
            const multiSignature = TransactionFactory.init(app)
                .multiSignature(participants, 3)
                .withPassphrase(passphrase)
                .withPassphraseList(passphrases)
                .createOne();

            await expect(multiSignature).toBeAccepted();
            await snoozeForBlock(1);
            await expect(multiSignature.id).toBeForged();

            // Send funds to multi signature wallet
            const multiSigAddress = Identities.Address.fromMultiSignatureAsset(multiSignature.asset.multiSignature);
            const multiSigPublicKey = Identities.PublicKey.fromMultiSignatureAsset(multiSignature.asset.multiSignature);

            const multiSignatureFunds = TransactionFactory.init(app)
                .transfer(multiSigAddress, 300 * 1e8)
                .withPassphrase(secrets[0])
                .createOne();

            await expect(multiSignatureFunds).toBeAccepted();
            await snoozeForBlock(1);
            await expect(multiSignatureFunds.id).toBeForged();

            // Registering a business
            let businessRegistration = TransactionFactory.init(app)
                .businessRegistration({
                    name: "ark",
                    website: "ark.io",
                })
                .withSenderPublicKey(multiSigPublicKey)
                .withPassphraseList(passphrases)
                .createOne();

            await expect(businessRegistration).toBeAccepted();
            await snoozeForBlock(1);
            await expect(businessRegistration.id).toBeForged();

            // Resigning a business
            let businessResignation = TransactionFactory.init(app)
                .businessResignation()
                .withSenderPublicKey(multiSigPublicKey)
                .withPassphraseList(passphrases)
                .createOne();

            await expect(businessResignation).toBeAccepted();
            await snoozeForBlock(1);
            await expect(businessResignation.id).toBeForged();

            // Reject a second resignation
            businessResignation = TransactionFactory.init(app)
                .businessResignation()
                .withSenderPublicKey(multiSigPublicKey)
                .withPassphraseList(passphrases)
                .createOne();

            await expect(businessResignation).toBeRejected();
            await snoozeForBlock(1);
            await expect(businessResignation.id).not.toBeForged();

            // Reject a new registration
            businessRegistration = TransactionFactory.init(app)
                .businessRegistration({
                    name: "ark",
                    website: "ark.io",
                })
                .withSenderPublicKey(multiSigPublicKey)
                .withPassphraseList(passphrases)
                .createOne();

            await expect(businessRegistration).toBeRejected();
            await snoozeForBlock(1);
            await expect(businessRegistration.id).not.toBeForged();
        });
    });
});