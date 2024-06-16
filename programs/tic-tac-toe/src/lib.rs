use anchor_lang::prelude::*;

declare_id!("J4keZe4ew164YgrqkRNZzb7AJRLZpkFPpoCGu1ZiTEht");

#[program]
pub mod tic_tac_toe {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, player_x: Pubkey, player_o: Pubkey) -> Result<()> {
        let game = &mut ctx.accounts.game;
        game.player_x = player_x;
        game.player_o = player_o;
        game.turn = player_x;
        game.board = [[None; 3]; 3];
        game.status = GameStatus::Ongoing;
        Ok(())
    }

    pub fn play(ctx: Context<Play>, row: u8, col: u8) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let player = &ctx.accounts.player;

        // Ensure it's the player's turn
        if game.turn != *player.key {
            return Err(ErrorCode::NotPlayersTurn.into());
        }

        // Ensure the game is ongoing
        match game.status {
            GameStatus::Ongoing => {}
            _ => return Err(ErrorCode::GameOver.into()),
        }

        // Ensure the cell is empty
        if game.board[row as usize][col as usize].is_some() {
            return Err(ErrorCode::CellOccupied.into());
        }

        // Make the move
        game.board[row as usize][col as usize] = if game.turn == game.player_x {
            Some(Cell { number: 1 })
        } else {
            Some(Cell { number: 2 })
        };

        // Check for a winner or draw
        if check_winner(&game.board, Cell { number: 1 }) {
            game.status = GameStatus::Won {
                winner: game.player_x,
            };
        } else if check_winner(&game.board, Cell { number: 2 }) {
            game.status = GameStatus::Won {
                winner: game.player_o,
            };
        } else if game
            .board
            .iter()
            .all(|row| row.iter().all(|&cell| cell.is_some()))
        {
            game.status = GameStatus::Draw;
        } else {
            // Switch turn
            game.turn = if game.turn == game.player_x {
                game.player_o
            } else {
                game.player_x
            };
        }

        Ok(())
    }
}
pub const MAXIMUM_SIZE: usize = (32 * 3) + (9 * 2) + 33; // Simplified size calculation
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 1024 +MAXIMUM_SIZE)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Play<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub player: Signer<'info>,
}

#[account]
pub struct Game {
    pub player_x: Pubkey,
    pub player_o: Pubkey,
    pub turn: Pubkey,
    pub board: [[Option<Cell>; 3]; 3],
    pub status: GameStatus,
}

#[derive(Clone, Copy, AnchorSerialize, AnchorDeserialize, PartialEq, Eq)]
pub struct Cell {
    pub number: i8,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize, PartialEq, Eq)]
pub enum GameStatus {
    Ongoing,
    Won { winner: Pubkey },
    Draw,
}

#[error_code]
pub enum ErrorCode {
    #[msg("It's not the player's turn.")]
    NotPlayersTurn,
    #[msg("The cell is already occupied.")]
    CellOccupied,
    #[msg("The game is already over.")]
    GameOver,
}

fn check_winner(board: &[[Option<Cell>; 3]; 3], player: Cell) -> bool {
    for i in 0..3 {
        if (board[i][0] == Some(player)
            && board[i][1] == Some(player)
            && board[i][2] == Some(player))
            || (board[0][i] == Some(player)
                && board[1][i] == Some(player)
                && board[2][i] == Some(player))
        {
            return true;
        }
    }
    if (board[0][0] == Some(player) && board[1][1] == Some(player) && board[2][2] == Some(player))
        || (board[0][2] == Some(player)
            && board[1][1] == Some(player)
            && board[2][0] == Some(player))
    {
        return true;
    }
    false
}
