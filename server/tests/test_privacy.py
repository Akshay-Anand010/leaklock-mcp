from leaklock.privacy import filter_statement_line


def test_keeps_an_outgoing_shop_charge():
    charge = filter_statement_line("2026-03-01 | NETFLIX.COM | 15.99 | USD")
    assert charge is not None
    assert charge.shop == "NETFLIX.COM"
    assert charge.amount == 15.99
    assert charge.currency == "USD"
    assert charge.date == "2026-03-01"
    assert not hasattr(charge, "balance")
    assert not hasattr(charge, "account_number")


def test_drops_balances_credits_peers_and_groceries():
    assert filter_statement_line("2026-03-01 | Ending balance | 2400.55 | USD") is None
    assert filter_statement_line("2026-03-02 | Payroll deposit | 1800.00 | USD | in") is None
    assert filter_statement_line("2026-03-02 | EMPLOYER | -1800.00 | USD") is None
    assert filter_statement_line("2026-03-03 | VENMO PAYMENT JANE | 40.00 | USD") is None
    assert filter_statement_line("2026-03-04 | TRADER JOE'S | 62.40 | USD") is None


def test_rupee_amounts_and_upi():
    rupees = filter_statement_line("2026-06-05 | NETFLIX | ₹149 | INR")
    assert rupees is not None
    assert rupees.amount == 149
    rs = filter_statement_line("2026-06-05 | AIRTEL | Rs 399 | INR")
    assert rs is not None and rs.amount == 399
    assert filter_statement_line("2026-06-05 | UPI/RAHUL SHARMA | 500 | INR") is None
    assert filter_statement_line("2026-06-05 | PHONEPE JOHN | 200 | INR") is None
    assert filter_statement_line("2026-06-05 | GPAY PRIYA | 100 | INR") is None
    assert filter_statement_line("2026-06-05 | PAYTM RAHUL | 80 | INR") is None
    assert filter_statement_line("2026-06-05 | IMPS to RAHUL | 1000 | INR") is None
    assert filter_statement_line("2026-06-05 | NEFT to SURESH | 2000 | INR") is None
    bill = filter_statement_line("2026-06-05 | UPI/NETFLIX | 149 | INR")
    assert bill is not None
    airtel = filter_statement_line("2026-06-05 | UPI-AIRTEL | 399 | INR")
    assert airtel is not None


def test_strips_account_and_card_numbers():
    charge = filter_statement_line(
        "2026-03-05 | NETFLIX.COM acct 111122223333 card 4111 1111 1111 1111 | 15.99 | USD"
    )
    assert charge is not None
    assert charge.shop == "NETFLIX.COM"
    assert "111122223333" not in charge.shop
    assert "4111" not in charge.shop
