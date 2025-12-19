// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Escrow} from "../src/Escrow.sol";

contract DeployEscrow is Script {
    function run() external {
        // Get worker address from environment variable
        address worker = vm.envAddress("WORKER_ADDRESS");
        
        // Get private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        Escrow escrow = new Escrow(worker);
        
        console.log("Escrow deployed at:", address(escrow));
        console.log("Owner:", escrow.owner());
        console.log("Worker:", escrow.worker());
        
        vm.stopBroadcast();
    }
}

