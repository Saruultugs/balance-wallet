import { get } from 'lodash';
import React, { Component } from 'react';
import { AlertIOS, StatusBar, Vibration } from 'react-native';
import { connect } from 'react-redux';
import { compose, withHandlers, onlyUpdateForKeys } from 'recompact';
import PropTypes from 'prop-types';
import { withTransactionConfirmationScreen } from '../hoc';
import { sendTransaction } from '../model/wallet';
import { walletConnectSendTransactionHash } from '../model/walletconnect';
import { getTransactionToApprove } from '../reducers/transactionsToApprove';
import TransactionConfirmationScreen from './TransactionConfirmationScreen';

class TransactionConfirmationScreenWithData extends Component {
  static propTypes = {
    getTransactionToApprove: PropTypes.func,
    navigation: PropTypes.any,
  }

  componentDidMount() {
    StatusBar.setBarStyle('light-content', true);
    this.showNewTransaction();
    Vibration.vibrate();
  }

  handleConfirmTransaction = async () => {
    try {
      const { transactionDetails } = this.props.navigation.state.params;
      const transactionReceipt = await sendTransaction(transactionDetails.transactionPayload.data, 'Confirm transaction' );
      if (transactionReceipt && transactionReceipt.hash) {
        try {
          await walletConnectSendTransactionHash(transactionDetails.transactionId, true, transactionReceipt.hash);
          // TODO: update that this transaction has been confirmed and reset txn details
          this.closeTransactionScreen();
        } catch (error) {
          // TODO error handling when txn hash failed to send; store somewhere?
          this.closeTransactionScreen();
          AlertIOS.alert('Failed to send transaction status');
        }
      } else {
        try {
          this.handleCancelTransaction();
        } catch (error) {
          this.closeTransactionScreen();
          AlertIOS.alert('Failed to send failed transaction status');
        }
      }
    } catch (error) {
      this.handleCancelTransaction();
      AlertIOS.alert('Authentication Failed');
    }
  };

  handleCancelTransaction = async () => {
    try {
      const { transactionDetails } = this.props.navigation.state.params;
      const walletConnector = this.props.walletConnectors[transactionDetails.sessionId];
      await walletConnectSendTransactionHash(walletConnector, transactionDetails.transactionId, false, null);
      this.closeTransactionScreen();
    } catch (error) {
      this.closeTransactionScreen();
      AlertIOS.alert('Failed to send cancelled transaction to WalletConnect');
    }
  }

  handleCancelTransaction = async () => {
    try {
      const { transactionDetails } = this.props.navigation.state.params;
      this.props.removeTransaction(transactionDetails.transactionId);
      await this.sendFailedTransactionStatus();
    } catch (error) {
      this.closeTransactionScreen();
      AlertIOS.alert('Failed to send rejected transaction status');
    }
  }

  closeTransactionScreen = () => {
    StatusBar.setBarStyle('dark-content', true);
    this.props.navigation.goBack();
  }

  showNewTransaction = () => {
    const transactionDetails = this.props.getTransactionToApprove();
    this.setState({ transactionDetails });
  }

  render = () => {
    const { transactionDetails } = this.props.navigation.state.params;
    const { transactionDisplayDetails:
      {
        asset,
        nativeAmount,
        to,
        value,
      }
    } = transactionDetails;
    return (
      <TransactionConfirmationScreen
        asset={{
          address: to,
          amount: value || '0.00',
          dappName: transactionDetails.dappName || '',
          name: asset.name || 'No data',
          nativeAmount: nativeAmount,
          symbol: asset.symbol || 'N/A',
        }}
        onCancelTransaction={this.handleCancelTransaction}
        onConfirmTransaction={this.handleConfirmTransaction}
      />
    );
  }
}

export default compose(
  withTransactionConfirmationScreen,
)(TransactionConfirmationScreenWithData);
