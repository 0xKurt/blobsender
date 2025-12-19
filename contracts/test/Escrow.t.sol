// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {Escrow} from "../src/Escrow.sol";

contract EscrowTest is Test {
    Escrow public escrow;
    address public owner = address(1);
    address public worker = address(2);
    address public user = address(3);
    
    bytes32 constant ESCROW_ID = keccak256("test-escrow");

    function setUp() public {
        vm.prank(owner);
        escrow = new Escrow(worker);
    }

    function test_CreateEscrow() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        escrow.createEscrow{value: 1 ether}(ESCROW_ID);
        
        (uint128 value, uint64 timestamp, bool fulfilled, address sender) = escrow.escrows(ESCROW_ID);
        assertEq(sender, user);
        assertEq(fulfilled, false);
        assertEq(value, 1 ether);
        assertGt(timestamp, 0);
    }

    function test_CreateEscrowRevertsIfExists() public {
        vm.deal(user, 2 ether);
        vm.startPrank(user);
        escrow.createEscrow{value: 1 ether}(ESCROW_ID);
        
        vm.expectRevert(Escrow.AlreadyExists.selector);
        escrow.createEscrow{value: 1 ether}(ESCROW_ID);
        vm.stopPrank();
    }

    function test_CreateEscrowRevertsIfNoValue() public {
        vm.expectRevert(Escrow.AlreadyExists.selector);
        vm.prank(user);
        escrow.createEscrow(ESCROW_ID);
    }

    function test_Fulfill() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        escrow.createEscrow{value: 1 ether}(ESCROW_ID);
        
        uint256 workerBalanceBefore = worker.balance;
        vm.prank(worker);
        escrow.fulfill(ESCROW_ID);
        
        (,, bool fulfilled,) = escrow.escrows(ESCROW_ID);
        assertEq(fulfilled, true);
        assertEq(worker.balance, workerBalanceBefore + 1 ether);
    }

    function test_FulfillRevertsIfNotWorker() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        escrow.createEscrow{value: 1 ether}(ESCROW_ID);
        
        vm.expectRevert(Escrow.NotWorker.selector);
        vm.prank(user);
        escrow.fulfill(ESCROW_ID);
    }

    function test_Withdraw() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        escrow.createEscrow{value: 1 ether}(ESCROW_ID);
        
        vm.warp(block.timestamp + 1 hours);
        
        uint256 userBalanceBefore = user.balance;
        vm.prank(user);
        escrow.withdraw(ESCROW_ID);
        
        (,,, address sender) = escrow.escrows(ESCROW_ID);
        assertEq(sender, address(0));
        assertEq(user.balance, userBalanceBefore + 1 ether);
    }

    function test_WithdrawRevertsIfTooEarly() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        escrow.createEscrow{value: 1 ether}(ESCROW_ID);
        
        vm.warp(block.timestamp + 30 minutes);
        
        vm.expectRevert(Escrow.TooEarly.selector);
        vm.prank(user);
        escrow.withdraw(ESCROW_ID);
    }

    function test_WithdrawRevertsIfFulfilled() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        escrow.createEscrow{value: 1 ether}(ESCROW_ID);
        
        vm.prank(worker);
        escrow.fulfill(ESCROW_ID);
        
        vm.warp(block.timestamp + 1 hours);
        vm.expectRevert(Escrow.AlreadyFulfilled.selector);
        vm.prank(user);
        escrow.withdraw(ESCROW_ID);
    }

    function test_EmergencyWithdraw() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        escrow.createEscrow{value: 1 ether}(ESCROW_ID);
        
        uint256 ownerBalanceBefore = owner.balance;
        vm.prank(owner);
        escrow.emergencyWithdraw();
        
        assertEq(owner.balance, ownerBalanceBefore + 1 ether);
    }

    function test_SetWorker() public {
        address newWorker = address(4);
        vm.prank(owner);
        escrow.setWorker(newWorker);
        
        assertEq(escrow.worker(), newWorker);
    }

    function test_SetOwner() public {
        address newOwner = address(5);
        vm.prank(owner);
        escrow.setOwner(newOwner);
        
        assertEq(escrow.owner(), newOwner);
    }
}

