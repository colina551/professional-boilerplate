import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailVerificationFields1795105368475 implements MigrationInterface {
    name = 'AddEmailVerificationFields1795105368475'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`email\` ON \`users\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`isVerified\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`verificationToken\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD UNIQUE INDEX \`IDX_945333aaddfc5b9021b2ee94d5\` (\`verificationToken\`)`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`verificationTokenExpiry\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`resetPasswordToken\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD UNIQUE INDEX \`IDX_4e8c8c78bc87861c7fb6b44bd3\` (\`resetPasswordToken\`)`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`resetPasswordExpiry\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`)`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`createdAt\` \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`updatedAt\` \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`updatedAt\` \`updatedAt\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`createdAt\` \`createdAt\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`resetPasswordExpiry\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP INDEX \`IDX_4e8c8c78bc87861c7fb6b44bd3\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`resetPasswordToken\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`verificationTokenExpiry\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP INDEX \`IDX_945333aaddfc5b9021b2ee94d5\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`verificationToken\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`isVerified\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`email\` ON \`users\` (\`email\`)`);
    }

}
