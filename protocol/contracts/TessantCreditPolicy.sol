// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @notice Immutable policy and dependency anchor for the Tessant BNB mainnet interface.
/// @dev This contract never holds collateral, borrows assets or receives approvals.
///      Financial execution remains in the external Lista market selected at deployment.
contract TessantCreditPolicy {
    uint256 public constant RATE_SCALE = 1 ether;

    address public immutable listaProvider;
    address public immutable collateralAsset;
    address public immutable debtAsset;
    address public immutable priceOracle;
    uint256 public immutable protocolLiquidationLtv;
    uint256 public immutable maxStartingLtv;

    error DependencyMissingCode();
    error InvalidPolicy();

    constructor(
        address listaProvider_,
        address collateralAsset_,
        address debtAsset_,
        address priceOracle_,
        uint256 protocolLiquidationLtv_,
        uint256 maxStartingLtv_
    ) {
        if (
            listaProvider_.code.length == 0 || collateralAsset_.code.length == 0
                || debtAsset_.code.length == 0 || priceOracle_.code.length == 0
        ) revert DependencyMissingCode();
        if (
            maxStartingLtv_ == 0 || maxStartingLtv_ >= protocolLiquidationLtv_
                || protocolLiquidationLtv_ > RATE_SCALE
        ) revert InvalidPolicy();

        listaProvider = listaProvider_;
        collateralAsset = collateralAsset_;
        debtAsset = debtAsset_;
        priceOracle = priceOracle_;
        protocolLiquidationLtv = protocolLiquidationLtv_;
        maxStartingLtv = maxStartingLtv_;
    }

    function isWithinStartingPolicy(uint256 collateralValue, uint256 debt) external view returns (bool) {
        if (collateralValue == 0) return debt == 0;
        return debt <= Math.mulDiv(collateralValue, maxStartingLtv, RATE_SCALE);
    }

    function breakEvenLtv(uint256 rewardApr, uint256 borrowApr) external pure returns (uint256) {
        if (borrowApr == 0) return type(uint256).max;
        return Math.mulDiv(rewardApr, RATE_SCALE, borrowApr);
    }

    function annualDebtChange(uint256 collateralValue, uint256 debt, uint256 rewardApr, uint256 borrowApr)
        external
        pure
        returns (bool debtDecreases, uint256 amount)
    {
        uint256 rewards = Math.mulDiv(collateralValue, rewardApr, RATE_SCALE);
        uint256 interest = Math.mulDiv(debt, borrowApr, RATE_SCALE);
        debtDecreases = rewards >= interest;
        amount = debtDecreases ? rewards - interest : interest - rewards;
    }
}
