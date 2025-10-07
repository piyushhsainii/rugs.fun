use anchor_lang::prelude::*;
use anchor_spl::{token_2022::{transfer_checked, TransferChecked}, token_interface::{Mint, TokenAccount, TokenInterface}};

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub signer:Signer<'info>,
    #[account(
        mut,
        seeds=[b"bank_reserve"],
        bump
    )]
    pub bank_account:InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint=mint,
        associated_token::authority=signer
    )]
    pub user_account:InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
    )]
    pub mint:InterfaceAccount<'info,Mint>,
    pub token_program:Interface<'info,TokenInterface>
}

pub fn process_deposit(ctx: Context<Deposit>, amount:u64) -> Result<()> {
    
    let cpi_context = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked{
            authority:ctx.accounts.signer.to_account_info(),
            from:ctx.accounts.signer.to_account_info(),
            to:ctx.accounts.bank_account.to_account_info(),
            mint:ctx.accounts.mint.to_account_info()
        }
    );

    transfer_checked(cpi_context, amount, ctx.accounts.mint.decimals)?;
    msg!("Successfully deposited user's amount to platform.");
    Ok(())
}
