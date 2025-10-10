use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{Mint, TokenAccount, TokenInterface}};


#[derive(Accounts)]
pub struct Admin<'info> {
    #[account(mut)]
    pub signer:Signer<'info>,
    #[account(
       init,
       payer=signer,
       seeds=[b"bank_authority"],
       space=8 + 8 ,
       bump,
       owner= System::id()
    )]
    pub bank_authority:UncheckedAccount<'info>,
    #[account(
        init,
        payer=signer,
        associated_token::mint=mint,
        associated_token::authority=bank_authority,
        associated_token::token_program=token_program
    )]
    pub bank_account:InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    pub system_program:Program<'info, System>,
    pub token_program:Interface<'info,TokenInterface>,
    pub associated_token_program:Program<'info, AssociatedToken>
}

pub fn admin(ctx:Context<Admin>)-> Result<()>{

    msg!("Initialized Admin Account!");
    Ok(())
}
