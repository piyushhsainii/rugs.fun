pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("AAd85DCUFZpLB2JxUTqkBWHyfNfAyzq3HTSuqeBnAxjw");

#[program]
pub mod rugs_fun {
    use super::*;

    pub fn deposit(ctx: Context<Deposit>,amount:u64) -> Result<()> {
        instructions::process_deposit(ctx,amount)?;
        Ok(())
    }
    pub fn instructions(ctx: Context<Admin>) -> Result<()> {
        instructions::admin(ctx)?;
        Ok(())
    }
    pub fn withdraw(ctx: Context<Withdraw>,amount:u64) -> Result<()> {
        instructions::process_withdraw(ctx,amount)?;
        Ok(())
    }
}
