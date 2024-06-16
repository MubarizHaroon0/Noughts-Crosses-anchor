const fs = require('fs');
const path = require('path');
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TicTacToe } from "../target/types/tic_tac_toe";
import { assert } from 'chai'
describe("tic-tac-toe", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.TicTacToe as Program<TicTacToe>;
  let gameKeypair: anchor.web3.Keypair;
  let playerX: anchor.web3.Keypair;
  let playerO: anchor.web3.Keypair;

  beforeEach(async () => {
    // Generate a new Keypair for the Game
    gameKeypair = anchor.web3.Keypair.generate();
    playerX = anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync("/home/mubariz/Documents/SolanaDev/PayFees.json", 'utf8'))));
    playerO = anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync("/home/mubariz/p2.json", 'utf8'))));
    // Airdrop SOL to player accounts to cover transaction fees
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(playerX.publicKey, 1e9)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(playerO.publicKey, 1e9)
    );

    // Initialize the game
    await program.methods
      .initialize(playerX.publicKey, playerO.publicKey)
      .accounts({
        game: gameKeypair.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([gameKeypair])
      .rpc();
  });
  it("Initializes the game correctly", async () => {
    const game = await program.account.game.fetch(gameKeypair.publicKey);

    assert.strictEqual(game.playerX.toBase58(), playerX.publicKey.toBase58());
    assert.strictEqual(game.playerO.toBase58(), playerO.publicKey.toBase58());
    assert.strictEqual(game.turn.toBase58(), playerX.publicKey.toBase58());
    assert.deepEqual(game.status.ongoing, {});
    assert.deepStrictEqual(game.board, [[null, null, null], [null, null, null], [null, null, null]]);
  });
  it("Player X makes a move", async () => {
    await program.methods
      .play(0, 0)
      .accounts({
        game: gameKeypair.publicKey,
        player: playerX.publicKey,
      })
      .signers([playerX])
      .rpc();

    const game = await program.account.game.fetch(gameKeypair.publicKey);
    assert.deepEqual(game.board[0][0].number, 1);
    assert.strictEqual(game.turn.toBase58(), playerO.publicKey.toBase58());
  });

  it("Player O makes a move", async () => {
    await program.methods
      .play(0, 0)
      .accounts({
        game: gameKeypair.publicKey,
        player: playerX.publicKey,
      })
      .signers([playerX])
      .rpc();

    await program.methods
      .play(1, 1)
      .accounts({
        game: gameKeypair.publicKey,
        player: playerO.publicKey,
      })
      .signers([playerO])
      .rpc();

    const game = await program.account.game.fetch(gameKeypair.publicKey);
    assert.deepStrictEqual(game.board[0][0].number, 1);
    assert.deepStrictEqual(game.board[1][1].number, 2);
    assert.strictEqual(game.turn.toBase58(), playerX.publicKey.toBase58());
  });

  it("Cannot play out of turn", async () => {
    await program.methods
      .play(0, 0)
      .accounts({
        game: gameKeypair.publicKey,
        player: playerX.publicKey,
      })
      .signers([playerX])
      .rpc();

    try {
      await program.methods
        .play(0, 1)
        .accounts({
          game: gameKeypair.publicKey,
          player: playerX.publicKey,
        })
        .signers([playerX])
        .rpc();
      assert.fail("Expected an error for playing out of turn");
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, "NotPlayersTurn");
    }
  });
  it("Cannot play in an occupied cell", async () => {
    await program.methods
      .play(0, 0)
      .accounts({
        game: gameKeypair.publicKey,
        player: playerX.publicKey,
      })
      .signers([playerX])
      .rpc();

    await program.methods
      .play(1, 1)
      .accounts({
        game: gameKeypair.publicKey,
        player: playerO.publicKey,
      })
      .signers([playerO])
      .rpc();

    try {
      await program.methods
        .play(0, 0)
        .accounts({
          game: gameKeypair.publicKey,
          player: playerX.publicKey,
        })
        .signers([playerX])
        .rpc();
      assert.fail("Expected an error for playing in an occupied cell");
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, "CellOccupied");
    }
  });

  it("Detects a winner", async () => {
    await program.methods
      .play(0, 0)
      .accounts({
        game: gameKeypair.publicKey,
        player: playerX.publicKey,
      })
      .signers([playerX])
      .rpc();

    await program.methods
      .play(1, 0)
      .accounts({
        game: gameKeypair.publicKey,
        player: playerO.publicKey,
      })
      .signers([playerO])
      .rpc();

    await program.methods
      .play(0, 1)
      .accounts({
        game: gameKeypair.publicKey,
        player: playerX.publicKey,
      })
      .signers([playerX])
      .rpc();

    await program.methods
      .play(1, 1)
      .accounts({
        game: gameKeypair.publicKey,
        player: playerO.publicKey,
      })
      .signers([playerO])
      .rpc();

    await program.methods
      .play(0, 2)
      .accounts({
        game: gameKeypair.publicKey,
        player: playerX.publicKey,
      })
      .signers([playerX])
      .rpc();

    const game = await program.account.game.fetch(gameKeypair.publicKey);
    assert.strictEqual(game.status.won.winner.toBase58(), playerX.publicKey.toBase58());
  });
  it("Detects a draw", async () => {
    // Simulate moves leading to a draw
    const moves: [number, number, anchor.web3.Keypair][] = [
      [0, 0, playerX],
      [0, 1, playerO],
      [0, 2, playerX],
      [1, 0, playerO],
      [1, 2, playerX],
      [1, 1, playerO],
      [2, 0, playerX],
      [2, 2, playerO],
      [2, 1, playerX],
    ];

    for (const [row, col, player] of moves) {
      await program.methods
        .play(row, col)
        .accounts({
          game: gameKeypair.publicKey,
          player: player.publicKey,
        })
        .signers([player])
        .rpc();
    }

    const game = await program.account.game.fetch(gameKeypair.publicKey);
    assert.deepStrictEqual(game.status.draw, {});
  });
});
