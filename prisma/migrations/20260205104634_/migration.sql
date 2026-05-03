/*
  Warnings:

  - You are about to drop the column `ambientMode` on the `DJSettings` table. All the data in the column will be lost.
  - You are about to drop the column `visualizerMode` on the `DJSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `DJSettings` DROP COLUMN `ambientMode`,
    DROP COLUMN `visualizerMode`;
