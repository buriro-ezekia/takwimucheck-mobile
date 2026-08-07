// Applies build-profile-specific native configuration without weakening production transport security.

export default ({ config }) => {
  const isDevelopmentBuild = process.env.APP_VARIANT === 'development';

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: isDevelopmentBuild,
          },
        },
      ],
    ],
  };
};
