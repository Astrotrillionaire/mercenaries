module bounty::bounty_system;

use std::string::String;
use sui::{balance::{Self, Balance}, clock::Clock, coin::{Self, Coin}, event};
use world::character::Character;
use world::killmail::Killmail;

#[error(code = 0)] const EZeroPayment: vector<u8> = b"Amount must be greater than zero";
#[error(code = 1)] const EInfoTooLong: vector<u8> = b"Info must be 32 characters or less";
#[error(code = 2)] const EKillerMismatch: vector<u8> = b"Killmail killer does not match killer character";
#[error(code = 3)] const EVictimMismatch: vector<u8> = b"Killmail victim does not match bounty target";
#[error(code = 4)] const EKillTooEarly: vector<u8> = b"Kill occurred before bounty was posted";


public struct Bounty<phantom T> has key {
    id: UID,
    tar: address,
    info: String,
    pot: Balance<T>,
    timestamp: u64,
}

public struct BountyCreatedEvent has copy, drop {
    bounty_id: ID,
    tar: address,
    info: String,
    amount: u64,
    creator: address,
    timestamp: u64,
    coin_type: String,
}

public struct BountyContributedEvent has copy, drop {
    bounty_id: ID,
    tar: address,
    amount: u64,
    contributor: address,
    new_pot: u64,
}

public struct BountyClaimedEvent has copy, drop {
    bounty_id: ID,
    tar: address,
    amount: u64,
    recipient: address,
}


public fun create_bounty<T>(
    tar: address,
    info: String,
    payment: Coin<T>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(coin::value(&payment) > 0, EZeroPayment);
    assert!(info.length() <= 32, EInfoTooLong);
    let amount = coin::value(&payment);
    let timestamp = clock.timestamp_ms();
    let bounty = Bounty<T> {
        id: object::new(ctx),
        tar,
        info,
        pot: coin::into_balance(payment),
        timestamp,
    };
    event::emit(BountyCreatedEvent {
        bounty_id: object::id(&bounty),
        tar,
        info,
        amount,
        creator: ctx.sender(),
        timestamp,
        coin_type: std::type_name::with_defining_ids<T>().into_string().to_string(),
    });
    transfer::share_object(bounty);
}

public fun contribute_bounty<T>(
    bounty: &mut Bounty<T>,
    payment: Coin<T>,
    ctx: &mut TxContext,
) {
    assert!(coin::value(&payment) > 0, EZeroPayment);
    let amount = coin::value(&payment);
    balance::join(&mut bounty.pot, coin::into_balance(payment));
    event::emit(BountyContributedEvent {
        bounty_id: object::id(bounty),
        tar: bounty.tar,
        amount,
        contributor: ctx.sender(),
        new_pot: balance::value(&bounty.pot),
    });
}

public fun payout_bounty<T>(
    bounty: Bounty<T>,
    killmail: &Killmail,
    killer_char: &Character,
    victim_char: &Character,
    ctx: &mut TxContext,
) {
    assert!(killmail.killer_id() == killer_char.key(), EKillerMismatch);
    assert!(killmail.victim_id() == victim_char.key(), EVictimMismatch);
    assert!(victim_char.character_address() == bounty.tar, EVictimMismatch);
    assert!(killmail.kill_timestamp() * 1000 > bounty.timestamp, EKillTooEarly);

    let killer_address = killer_char.character_address();
    let Bounty { id, tar, info: _, pot, timestamp: _ } = bounty;
    let amount = balance::value(&pot);
    let payout_coin = coin::from_balance(pot, ctx);
    transfer::public_transfer(payout_coin, killer_address);
    event::emit(BountyClaimedEvent {
        bounty_id: id.to_inner(),
        tar,
        amount,
        recipient: killer_address,
    });
    id.delete();
}

public fun tar<T>(bounty: &Bounty<T>): address { bounty.tar }
public fun info<T>(bounty: &Bounty<T>): String { bounty.info }
public fun pot_amount<T>(bounty: &Bounty<T>): u64 { balance::value(&bounty.pot) }
public fun timestamp<T>(bounty: &Bounty<T>): u64 { bounty.timestamp }
