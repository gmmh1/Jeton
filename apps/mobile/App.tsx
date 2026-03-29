import { BarCodeScanner } from 'expo-barcode-scanner';
import { useEffect, useState } from 'react';
import { Button, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

export default function App() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanEnabled, setScanEnabled] = useState(false);
  const [email, setEmail] = useState('mobile.shipper@jetoncargo.com');
  const [password, setPassword] = useState('testpass123');
  const [token, setToken] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [supportQuery, setSupportQuery] = useState('Where is my shipment JET-1774766070259?');
  const [result, setResult] = useState('Ready. Login, then create shipment or scan tracking QR.');

  async function login() {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const body = await response.json();
    if (!response.ok || !body.accessToken) {
      setResult(`Login failed: ${JSON.stringify(body)}`);
      return;
    }

    setToken(body.accessToken);
    setResult(`Logged in as ${email}. Token received.`);
  }

  async function calculateSamplePrice() {
    const response = await fetch(`${API_BASE}/pricing/calculate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        origin: 'DXB',
        destination: 'LHR',
        weight: 45,
        cbm: 0.2
      })
    });

    const body = await response.json();
    setResult(`Price response (${response.status}): ${JSON.stringify(body)}`);
  }

  async function createSampleShipment() {
    if (!token) {
      setResult('Please login first.');
      return;
    }

    const response = await fetch(`${API_BASE}/shipments`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        origin: 'DXB',
        destination: 'LHR',
        weight: 27,
        volume: 0.14
      })
    });

    const body = await response.json();
    setResult(`Shipment create (${response.status}): ${JSON.stringify(body)}`);
  }

  async function askSupport() {
    const response = await fetch(`${API_BASE}/support/query`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        customerEmail: email,
        query: supportQuery
      })
    });

    const body = await response.json();
    setResult(`Support (${response.status}): ${JSON.stringify(body)}`);
  }

  async function createPaymentLink() {
    if (!token) {
      setResult('Please login first.');
      return;
    }

    if (!bookingId) {
      setResult('Please enter a bookingId first.');
      return;
    }

    const response = await fetch(`${API_BASE}/payments/checkout-session`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        bookingId,
        amount: 99,
        currency: 'USD',
        successUrl: 'https://app.jetoncargo.com/pay/success',
        cancelUrl: 'https://app.jetoncargo.com/pay/cancel'
      })
    });

    const body = await response.json();
    setResult(`Payment link (${response.status}): ${JSON.stringify(body)}`);
  }

  async function lookupScan(code: string) {
    if (!token) {
      setResult(`Scanned ${code}. Login first to call /scan endpoint.`);
      return;
    }

    const response = await fetch(`${API_BASE}/scan/${encodeURIComponent(code)}`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    const body = await response.json();
    setResult(`Scan lookup (${response.status}): ${JSON.stringify(body)}`);
  }

  useEffect(() => {
    BarCodeScanner.requestPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  if (hasPermission === null) {
    return <Text>Requesting camera access...</Text>;
  }

  if (!hasPermission) {
    return <Text>No camera permission.</Text>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Jeton Mobile Ops</Text>
        <Text style={styles.subtitle}>API Base: {API_BASE}</Text>

        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" style={styles.input} placeholder="Email" />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          style={styles.input}
          placeholder="Password"
        />

        <View style={styles.buttonRow}>
          <Button title="Login" onPress={login} />
          <Button title="Price Check" onPress={calculateSamplePrice} />
          <Button title="Create Shipment" onPress={createSampleShipment} />
          <Button title="Ask Support Bot" onPress={askSupport} />
        </View>

        <TextInput
          value={supportQuery}
          onChangeText={setSupportQuery}
          autoCapitalize="none"
          style={styles.input}
          placeholder="Support query"
        />

        <TextInput
          value={bookingId}
          onChangeText={setBookingId}
          autoCapitalize="none"
          style={styles.input}
          placeholder="Booking ID for payment link"
        />
        <Button title="Create Payment Link" onPress={createPaymentLink} />

        <Text style={styles.result}>{result}</Text>

        <View style={styles.scannerWrap}>
          {scanEnabled ? (
            <BarCodeScanner
              style={StyleSheet.absoluteFillObject}
              onBarCodeScanned={(event) => {
                setScanEnabled(false);
                lookupScan(event.data);
              }}
            />
          ) : (
            <View style={styles.placeholder}>
              <Text>Scanner paused</Text>
            </View>
          )}
        </View>

        <Button title={scanEnabled ? 'Scanning...' : 'Start Scan'} onPress={() => setScanEnabled(true)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8f5',
    paddingHorizontal: 16,
    paddingTop: 16
  },
  content: {
    gap: 12,
    paddingBottom: 24
  },
  title: {
    fontSize: 28,
    fontWeight: '700'
  },
  subtitle: {
    color: '#425144'
  },
  input: {
    borderWidth: 1,
    borderColor: '#c6d1c8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff'
  },
  buttonRow: {
    gap: 10
  },
  result: {
    color: '#1f2e22',
    fontSize: 13,
    lineHeight: 19
  },
  scannerWrap: {
    height: 360,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#c6d1c8'
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
