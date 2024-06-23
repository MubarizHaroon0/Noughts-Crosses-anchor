# Noughts-Crosses-anchor
TicTacToe On Anchor
# Providing Wallet
set up the wallet variable to your keypair path in Anchor.toml
```console
[provider]
cluster = "localnet"
wallet = "KEYPAIR_PATH/KeyPair.json"
```
# How to Run
Make Sure You have Solana CLi Installed
https://docs.solanalabs.com/cli/install
```console
anchor build
```
Make Sure the Local Cluster is running
```console
solana-test-validator
```
```console
anchor deploy 
```
# Testing
test Cases are present at tests/tic_tac_toe.ts

Stop the running Cluster,then 
```console
anchor test
```
# Client
https://github.com/MubarizHaroon0/-Noughts-Crosses-Client


