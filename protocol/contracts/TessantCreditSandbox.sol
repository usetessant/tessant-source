// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MockLisUSD is ERC20 {
    address public immutable sandbox;

    error SandboxOnly();

    constructor() ERC20("Test lisUSD", "tlisUSD") {
        sandbox = msg.sender;
    }

    function mint(address account, uint256 amount) external {
        if (msg.sender != sandbox) revert SandboxOnly();
        _mint(account, amount);
    }

    function burn(uint256 amount) external {
        if (msg.sender != sandbox) revert SandboxOnly();
        _burn(msg.sender, amount);
    }
}

contract TessantCreditSandbox is ReentrancyGuard {
    uint256 public constant BNB_PRICE = 750 ether;
    uint256 public constant RATE_SCALE = 1_000_000;
    uint256 public constant BASE_REWARD_APR = 8_860;
    uint256 public constant BORROW_APR = 45_288;
    uint256 public constant MAX_OPEN_LTV = 450_000;
    uint256 public constant LIQUIDATION_LTV = 800_000;
    uint256 private constant YEAR = 365 days;

    struct Position {
        uint256 collateral;
        uint256 debt;
        uint64 lastAccrued;
    }

    MockLisUSD public immutable mockLisUSD;
    mapping(address => Position) public positions;

    error AmountRequired();
    error InsufficientCollateral();
    error LtvExceeded();
    error TransferFailed();

    event CollateralDeposited(address indexed account, uint256 amount);
    event CreditBorrowed(address indexed account, uint256 amount);
    event CreditRepaid(address indexed account, uint256 amount);
    event PositionSettled(address indexed account, uint256 rewards, uint256 interest, uint256 debtAfter);
    event CollateralWithdrawn(address indexed account, uint256 amount);

    constructor() {
        mockLisUSD = new MockLisUSD();
    }

    function deposit() external payable {
        if (msg.value == 0) revert AmountRequired();
        _settle(msg.sender);
        positions[msg.sender].collateral += msg.value;
        emit CollateralDeposited(msg.sender, msg.value);
    }

    function borrow(uint256 amount) external {
        if (amount == 0) revert AmountRequired();
        _settle(msg.sender);
        Position storage position = positions[msg.sender];
        uint256 nextDebt = position.debt + amount;
        if (nextDebt > _maxDebt(position.collateral, MAX_OPEN_LTV)) revert LtvExceeded();
        position.debt = nextDebt;
        mockLisUSD.mint(msg.sender, amount);
        emit CreditBorrowed(msg.sender, amount);
    }

    function repay(uint256 amount) external nonReentrant {
        if (amount == 0) revert AmountRequired();
        _settle(msg.sender);
        Position storage position = positions[msg.sender];
        uint256 payment = amount > position.debt ? position.debt : amount;
        mockLisUSD.transferFrom(msg.sender, address(this), payment);
        mockLisUSD.burn(payment);
        position.debt -= payment;
        emit CreditRepaid(msg.sender, payment);
    }

    function settle() external {
        _settle(msg.sender);
    }

    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert AmountRequired();
        _settle(msg.sender);
        Position storage position = positions[msg.sender];
        if (amount > position.collateral) revert InsufficientCollateral();
        uint256 remaining = position.collateral - amount;
        if (position.debt > _maxDebt(remaining, LIQUIDATION_LTV)) revert LtvExceeded();
        position.collateral = remaining;
        (bool sent,) = msg.sender.call{value: amount}("");
        if (!sent) revert TransferFailed();
        emit CollateralWithdrawn(msg.sender, amount);
    }

    function positionOf(address account) external view returns (uint256 collateral, uint256 debt, uint256 pendingRewards, uint256 pendingInterest, uint256 healthFactorE18) {
        Position memory position = positions[account];
        (pendingRewards, pendingInterest) = _pending(position);
        debt = position.debt + pendingInterest;
        debt = pendingRewards >= debt ? 0 : debt - pendingRewards;
        collateral = position.collateral;
        healthFactorE18 = debt == 0 ? type(uint256).max : (_collateralValue(collateral) * LIQUIDATION_LTV * 1 ether) / (debt * RATE_SCALE);
    }

    function _settle(address account) internal {
        Position storage position = positions[account];
        if (position.lastAccrued == 0) {
            position.lastAccrued = uint64(block.timestamp);
            return;
        }
        (uint256 rewards, uint256 interest) = _pending(position);
        uint256 debtWithInterest = position.debt + interest;
        position.debt = rewards >= debtWithInterest ? 0 : debtWithInterest - rewards;
        position.lastAccrued = uint64(block.timestamp);
        emit PositionSettled(account, rewards, interest, position.debt);
    }

    function _pending(Position memory position) internal view returns (uint256 rewards, uint256 interest) {
        if (position.lastAccrued == 0 || position.debt == 0) return (0, 0);
        uint256 elapsed = block.timestamp - position.lastAccrued;
        rewards = (_collateralValue(position.collateral) * BASE_REWARD_APR * elapsed) / (RATE_SCALE * YEAR);
        interest = (position.debt * BORROW_APR * elapsed) / (RATE_SCALE * YEAR);
    }

    function _collateralValue(uint256 collateral) internal pure returns (uint256) {
        return (collateral * BNB_PRICE) / 1 ether;
    }

    function _maxDebt(uint256 collateral, uint256 ltv) internal pure returns (uint256) {
        return (_collateralValue(collateral) * ltv) / RATE_SCALE;
    }
}
