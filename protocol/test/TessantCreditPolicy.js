import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("TessantCreditPolicy", function () {
  async function deployPolicy(maxStartingLtv = ethers.parseEther("0.15")) {
    const dependency = await ethers.deployContract("MockLisUSD");
    await dependency.waitForDeployment();
    const dependencyAddress = await dependency.getAddress();
    const policy = await ethers.deployContract("TessantCreditPolicy", [
      dependencyAddress,
      dependencyAddress,
      dependencyAddress,
      dependencyAddress,
      ethers.parseEther("0.8"),
      maxStartingLtv,
    ]);
    await policy.waitForDeployment();
    return { policy, dependencyAddress };
  }

  it("anchors dependencies and an immutable low-LTV policy", async function () {
    const { policy, dependencyAddress } = await deployPolicy();
    expect(await policy.listaProvider()).to.equal(dependencyAddress);
    expect(await policy.maxStartingLtv()).to.equal(ethers.parseEther("0.15"));
  });

  it("rejects dependencies without deployed code", async function () {
    const factory = await ethers.getContractFactory("TessantCreditPolicy");
    await expect(factory.deploy(
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      ethers.parseEther("0.8"),
      ethers.parseEther("0.15"),
    )).to.be.revertedWithCustomError(factory, "DependencyMissingCode");
  });

  it("rejects a starting policy at or above the liquidation limit", async function () {
    const dependency = await ethers.deployContract("MockLisUSD");
    await dependency.waitForDeployment();
    const dependencyAddress = await dependency.getAddress();
    const factory = await ethers.getContractFactory("TessantCreditPolicy");
    await expect(factory.deploy(
      dependencyAddress,
      dependencyAddress,
      dependencyAddress,
      dependencyAddress,
      ethers.parseEther("0.8"),
      ethers.parseEther("0.8"),
    )).to.be.revertedWithCustomError(factory, "InvalidPolicy");
  });

  it("checks the maximum starting LTV without taking custody", async function () {
    const { policy } = await deployPolicy();
    expect(await policy.isWithinStartingPolicy(ethers.parseEther("1000"), ethers.parseEther("150"))).to.equal(true);
    expect(await policy.isWithinStartingPolicy(ethers.parseEther("1000"), ethers.parseEther("151"))).to.equal(false);
  });

  it("calculates the break-even LTV", async function () {
    const { policy } = await deployPolicy();
    expect(await policy.breakEvenLtv(8_860_000_000_000_000n, 45_288_001_800_000_000n)).to.equal(195_636_805_508_164_416n);
  });

  it("reports whether the annual spread reduces debt", async function () {
    const { policy } = await deployPolicy();
    const result = await policy.annualDebtChange(
      ethers.parseEther("1875"),
      ethers.parseEther("225"),
      8_860_000_000_000_000n,
      45_288_001_800_000_000n,
    );
    expect(result[0]).to.equal(true);
    expect(result[1]).to.equal(6_422_699_595_000_000_000n);
  });
});
