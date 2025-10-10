use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_2022::{transfer_checked, TransferChecked}, token_interface::{Mint, TokenAccount, TokenInterface}};


#[derive(Accounts)]
pub struct Withdraw<'info> {

    #[account(mut)]
    pub signer:Signer<'info>,
    #[account(
        mut,
        seeds=[b"bank_authority"],
        bump,
        owner= System::id()
    )]
    pub bank_authority:SystemAccount<'info>,
    #[account(
        mut,
        associated_token::mint=mint,
        associated_token::authority=bank_authority,
        associated_token::token_program=token_program
    )]
    pub bank_account:InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint=mint,
        associated_token::authority=signer,
        associated_token::token_program=token_program
    )]
    pub user_account:InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
    )]
    pub mint:InterfaceAccount<'info,Mint>,
    pub token_program:Interface<'info,TokenInterface>,
    pub associated_token_program:Program<'info, AssociatedToken>


}

pub fn process_withdraw(ctx: Context<Withdraw>,amount:u64) -> Result<()> {
     
    let signer_seeds:&[&[&[u8]]] = &[&[b"bank_authority", &[ctx.bumps.bank_authority]]];

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked{
            authority:ctx.accounts.bank_authority.to_account_info(),
            from:ctx.accounts.bank_account.to_account_info(),
            to:ctx.accounts.user_account.to_account_info(),
            mint:ctx.accounts.mint.to_account_info()
        },
        signer_seeds
    );

    transfer_checked(cpi_context, amount, ctx.accounts.mint.decimals)?;
    msg!("Successfully deposited user's amount to platform.");
    Ok(())
}
