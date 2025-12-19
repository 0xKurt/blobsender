// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract Escrow {
    struct EscrowData {
        uint128 value;
        uint64 timestamp;
        bool fulfilled;
        address sender;
    }

    mapping(bytes32 => EscrowData) public escrows;
    address public owner;
    address public worker;
    uint64 constant WITHDRAW_DELAY = 1 hours;

    error AlreadyExists();
    error NotWorker();
    error NotOwner();
    error NotSender();
    error AlreadyFulfilled();
    error TooEarly();

    constructor(address _worker) {
        owner = msg.sender;
        worker = _worker;
    }

    function createEscrow(bytes32 _id) external payable {
        EscrowData storage e = escrows[_id];
        if (e.sender != address(0) || msg.value == 0) revert AlreadyExists();
        e.sender = msg.sender;
        e.value = uint128(msg.value);
        e.timestamp = uint64(block.timestamp);
    }

    function fulfill(bytes32 _id) external {
        if (msg.sender != worker) revert NotWorker();
        EscrowData storage e = escrows[_id];
        if (e.sender == address(0) || e.fulfilled) revert AlreadyFulfilled();
        e.fulfilled = true;
        (bool success, ) = worker.call{value: e.value}("");
        require(success);
    }

    function withdraw(bytes32 _id) external {
        EscrowData storage e = escrows[_id];
        if (msg.sender != e.sender || e.sender == address(0)) revert NotSender();
        if (e.fulfilled) revert AlreadyFulfilled();
        unchecked {
            if (block.timestamp < e.timestamp + WITHDRAW_DELAY) revert TooEarly();
        }
        uint128 value = e.value;
        delete escrows[_id];
        (bool success, ) = msg.sender.call{value: value}("");
        require(success);
    }

    function emergencyWithdraw() external {
        if (msg.sender != owner) revert NotOwner();
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success);
    }

    function setWorker(address _worker) external {
        if (msg.sender != owner) revert NotOwner();
        worker = _worker;
    }

    function setOwner(address _owner) external {
        if (msg.sender != owner) revert NotOwner();
        owner = _owner;
    }
}
