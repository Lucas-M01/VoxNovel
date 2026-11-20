import NetInfo, { NetInfoStateType } from '@react-native-community/netinfo';
import { act, render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { chapterAvailable, connectivityStatus, useConnectivity } from '@core/connectivity';
import { OfflineNotice } from '@pattern/offline-notice';
import { createHttpResource } from '@core/http-resource';
import { apiMutations, createQueryClient } from '@core/queries';

jest.mock('@react-native-community/netinfo', () => jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock.js'));

function Probe() { return <Text>{useConnectivity()}</Text>; }
function emit(reachable: boolean | null) {
  const callback = jest.mocked(NetInfo.addEventListener).mock.calls.at(-1)?.[0];
  if (!callback) throw new Error('Expected native subscriber');
  callback({ type: NetInfoStateType.wifi, isConnected: true, isInternetReachable: reachable, details: { isConnectionExpensive: false, ssid: null, bssid: null, strength: null, ipAddress: null, subnet: null, frequency: null, linkSpeed: null, rxLinkSpeed: null, txLinkSpeed: null } });
}

test('unknown connectivity stays optimistic and only explicit unreachable state blocks navigation', () => {
  expect(connectivityStatus({ isInternetReachable: null })).toBe('unknown');
  expect(connectivityStatus({ isInternetReachable: true })).toBe('online');
  expect(connectivityStatus({ isInternetReachable: false })).toBe('offline');
  expect(connectivityStatus({ incompatible: true })).toBe('unknown');
  expect(chapterAvailable(false, new Set(), 2)).toBe(true);
  expect(chapterAvailable(true, new Set([2]), 2)).toBe(true);
  expect(chapterAvailable(true, new Set([2]), 3)).toBe(false);
  expect(chapterAvailable(false, new Set(), 0)).toBe(false);
  expect(chapterAvailable(false, new Set(), 1.5)).toBe(false);
});

test('subscribers share one native listener, update queries/notices and clean up on unmount', async () => {
  jest.mocked(NetInfo.addEventListener).mockClear();
  const remove = jest.fn();
  jest.mocked(NetInfo.addEventListener).mockReturnValue(remove);
  await render(<View><Probe /><Probe /><OfflineNotice mode="reading" /><OfflineNotice mode="speech" /></View>);
  expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
  expect(screen.getAllByText('unknown')).toHaveLength(2);
  expect(screen.queryByText('Sem internet — só capítulos baixados')).toBeNull();
  await act(async () => emit(false));
  expect(screen.getAllByText('offline')).toHaveLength(2);
  expect(screen.getByText('Sem internet — só capítulos baixados')).toBeOnTheScreen();
  expect(screen.getByText('Sem internet — só os capítulos baixados estão disponíveis')).toBeOnTheScreen();
  expect(onlineManager.isOnline()).toBe(false);
  await act(async () => emit(true));
  expect(screen.getAllByText('online')).toHaveLength(2);
  expect(onlineManager.isOnline()).toBe(true);
  await screen.unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});

test('offline writes fail once without queuing progress synchronization for reconnection', async () => {
  const transport = jest.fn(async () => { throw new Error('Synthetic offline'); });
  const request = createHttpResource({ baseUrl: () => 'http://api.example', transport });
  const client = createQueryClient();
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({ ...defaults, mutations: { ...defaults.mutations, gcTime: Infinity } });
  onlineManager.setOnline(false);
  try {
    await expect(client.getMutationCache().build(client, apiMutations(client, request).progress()).execute({ id: '11111111-1111-4111-8111-111111111111', chapter: 2 })).rejects.toMatchObject({ kind: 'network' });
    expect(transport).toHaveBeenCalledTimes(1);
    onlineManager.setOnline(true);
    await Promise.resolve();
    expect(transport).toHaveBeenCalledTimes(1);
  } finally { onlineManager.setOnline(true); client.clear(); }
});
