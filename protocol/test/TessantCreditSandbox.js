import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("TessantCreditSandbox", function () {
  async function deployFixture() {
    const [user] = await ethers.getSigners();
    const sandbox = await ethers.deployContract("TessantCreditSandbox");
    await sandbox.waitForDeployment();
    const lisUsdAsset = await ethers.getContractAt("MockLisUSD", await sandbox.mockLisUSD());
    return { user, sandbox, lisUsdAsset };
  }

  it("opens a collateralized mock credit position", async function () {
    const { user, sandbox, lisUsdAsset } = await deployFixture();
    await expect(sandbox.deposit({ value: ethers.parseEther("1") })).to.emit(sandbox, "CollateralDeposited");
    await expect(sandbox.borrow(ethers.parseEther("75"))).to.emit(sandbox, "CreditBorrowed");
    expect(await lisUsdAsset.balanceOf(user.address)).to.equal(ethers.parseEther("75"));
    const position = await sandbox.positionOf(user.address);
    expect(position.collateral).to.equal(ethers.parseEther("1"));
    expect(position.debt).to.equal(ethers.parseEther("75"));
  });

  it("rejects debt above the sandbox opening limit", async function () {
    const { sandbox } = await deployFixture();
    await sandbox.deposit({ value: ethers.parseEther("1") });
    await expect(sandbox.borrow(ethers.parseEther("338"))).to.be.revertedWithCustomError(sandbox, "LtvExceeded");
  });

  it("reduces low-LTV debt when base rewards exceed interest", async function () {
    const { user, sandbox } = await deployFixture();
    await sandbox.deposit({ value: ethers.parseEther("1") });
    await sandbox.borrow(ethers.parseEther("75"));
    await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);
    await sandbox.settle();
    const position = await sandbox.positionOf(user.address);
    expect(position.debt).to.be.lessThan(ethers.parseEther("75"));
  });

  it("increases high-LTV debt when interest exceeds base rewards", async function () {
    const { user, sandbox } = await deployFixture();
    await sandbox.deposit({ value: ethers.parseEther("1") });
    await sandbox.borrow(ethers.parseEther("300"));
    await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);
    await sandbox.settle();
    const position = await sandbox.positionOf(user.address);
    expect(position.debt).to.be.greaterThan(ethers.parseEther("300"));
  });

  it("repays mock lisUSD and releases safe collateral", async function () {
    const { user, sandbox, lisUsdAsset } = await deployFixture();
    await sandbox.deposit({ value: ethers.parseEther("1") });
    await sandbox.borrow(ethers.parseEther("75"));
    await lisUsdAsset.approve(await sandbox.getAddress(), ethers.parseEther("25"));
    await expect(sandbox.repay(ethers.parseEther("25"))).to.emit(sandbox, "CreditRepaid");
    await expect(sandbox.withdraw(ethers.parseEther("0.5"))).to.emit(sandbox, "CollateralWithdrawn");
    const position = await sandbox.positionOf(user.address);
    expect(position.collateral).to.equal(ethers.parseEther("0.5"));
    expect(position.debt).to.be.closeTo(ethers.parseEther("50"), ethers.parseUnits("0.001", 18));
  });
});
