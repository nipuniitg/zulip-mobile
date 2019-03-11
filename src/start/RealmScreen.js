/* @flow */
import { connect } from 'react-redux';

import React, { PureComponent } from 'react';
import { ScrollView, Keyboard, Text, Alert } from 'react-native';
import GeoCode from 'react-geocode';

import type { ApiResponseServerSettings, Dispatch } from '../types';
import { ErrorMsg, Label, SmartUrlInput, Screen, ZulipButton } from '../common';
import { isValidUrl } from '../utils/url';
import { getServerSettings } from '../api';
import { realmAdd, navigateToAuth } from '../actions';
import styles from '../styles';

type Props = {|
  dispatch: Dispatch,
  navigation: Object,
  initialRealm: string,
|};

type State = {|
  realm: string,
  error: ?string,
  progress: boolean,
  location: ?string,
|};

GeoCode.setApiKey('AIzaSyARGXU9PANCh81eawvOS0h0PgouTELyjJk');
GeoCode.enableDebug();

class RealmScreen extends PureComponent<Props, State> {
  state = {
    progress: false,
    realm: this.props.initialRealm,
    error: undefined,
    location: undefined,
  };

  scrollView: ScrollView;

  findCoordinates = () => {
    navigator.geolocation.getCurrentPosition(
      position => {
        const locationDescription = GeoCode.fromLatLng(
          position.coords.latitude,
          position.coords.longitude,
        ).then(
          response => {
            const address = response.results[0].formatted_address;
            const location = JSON.stringify(address);
            this.setState({ location });
          },
          error => {
            console.error(error);
          },
        );
      },
      error => Alert.alert(error.message),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
    );
  };

  tryRealm = async () => {
    const { realm } = this.state;

    this.setState({
      realm,
      progress: true,
      error: undefined,
    });

    const { dispatch } = this.props;

    try {
      const serverSettings: ApiResponseServerSettings = await getServerSettings(realm);
      dispatch(realmAdd(realm));
      dispatch(navigateToAuth(serverSettings));
      Keyboard.dismiss();
    } catch (err) {
      this.setState({ error: 'Cannot connect to server' });
    } finally {
      this.setState({ progress: false });
    }
  };

  handleRealmChange = value => this.setState({ realm: value });

  componentDidMount() {
    const { initialRealm } = this.props;
    this.findCoordinates();
    if (initialRealm && initialRealm.length > 0) {
      this.tryRealm();
    }
  }

  render() {
    const { initialRealm, navigation } = this.props;
    const { progress, error, realm } = this.state;

    return (
      <Screen title="Welcome" padding centerContent keyboardShouldPersistTaps="always">
        <Text>Location: {this.state.location}</Text>
        <Label text="Organization URL" />
        <SmartUrlInput
          style={styles.marginVertical}
          navigation={navigation}
          defaultOrganization="your-org"
          protocol="https://"
          append=".zulipchat.com"
          defaultValue={initialRealm}
          onChangeText={this.handleRealmChange}
          onSubmitEditing={this.tryRealm}
          enablesReturnKeyAutomatically
        />
        {error && <ErrorMsg error={error} />}
        <ZulipButton
          style={styles.halfMarginTop}
          text="Enter"
          progress={progress}
          onPress={this.tryRealm}
          disabled={!isValidUrl(realm)}
        />
      </Screen>
    );
  }
}

export default connect((state, props) => ({
  initialRealm:
    (props.navigation && props.navigation.state.params && props.navigation.state.params.realm)
    || '',
}))(RealmScreen);
