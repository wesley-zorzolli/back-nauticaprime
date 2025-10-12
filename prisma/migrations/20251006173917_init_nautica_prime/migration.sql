-- CreateEnum
CREATE TYPE "public"."Combustiveis" AS ENUM ('FLEX', 'GASOLINA', 'ETANOL', 'DIESEL');

-- CreateTable
CREATE TABLE "public"."marcas" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(30) NOT NULL,

    CONSTRAINT "marcas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."embarcacoes" (
    "id" SERIAL NOT NULL,
    "modelo" VARCHAR(30) NOT NULL,
    "ano" SMALLINT NOT NULL,
    "motor" VARCHAR(50) NOT NULL,
    "km_horas" VARCHAR(50) NOT NULL,
    "acessorios" TEXT,
    "foto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "marcaId" INTEGER NOT NULL,
    "adminId" VARCHAR(36),

    CONSTRAINT "embarcacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clientes" (
    "id" VARCHAR(36) NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "email" VARCHAR(40) NOT NULL,
    "senha" VARCHAR(60) NOT NULL,
    "cidade" VARCHAR(30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendas" (
    "id" SERIAL NOT NULL,
    "clienteId" VARCHAR(36) NOT NULL,
    "embarcacaoId" INTEGER NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data_venda" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adminId" VARCHAR(36),

    CONSTRAINT "vendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admins" (
    "id" VARCHAR(36) NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "email" VARCHAR(40) NOT NULL,
    "senha" VARCHAR(60) NOT NULL,
    "nivel" SMALLINT NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."logs" (
    "id" SERIAL NOT NULL,
    "adminId" VARCHAR(36) NOT NULL,
    "descricao" VARCHAR(60) NOT NULL,
    "complemento" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."embarcacoes" ADD CONSTRAINT "embarcacoes_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "public"."marcas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."embarcacoes" ADD CONSTRAINT "embarcacoes_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendas" ADD CONSTRAINT "vendas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendas" ADD CONSTRAINT "vendas_embarcacaoId_fkey" FOREIGN KEY ("embarcacaoId") REFERENCES "public"."embarcacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendas" ADD CONSTRAINT "vendas_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."logs" ADD CONSTRAINT "logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
