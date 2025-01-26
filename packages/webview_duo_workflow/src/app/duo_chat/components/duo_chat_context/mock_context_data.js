import {
  CONTEXT_ITEM_CATEGORY_ISSUE,
  CONTEXT_ITEM_CATEGORY_MERGE_REQUEST,
  CONTEXT_ITEM_CATEGORY_FILE,
  CONTEXT_ITEM_CATEGORY_LOCAL_GIT,
} from './constants';

export const MOCK_CATEGORIES = [
  { label: 'Files', value: CONTEXT_ITEM_CATEGORY_FILE, icon: 'document' },
  { label: 'Local Git', value: CONTEXT_ITEM_CATEGORY_LOCAL_GIT, icon: 'git' },
  { label: 'Issues', value: CONTEXT_ITEM_CATEGORY_ISSUE, icon: 'issues' },
  { label: 'Merge Requests', value: CONTEXT_ITEM_CATEGORY_MERGE_REQUEST, icon: 'merge-request' },
];

export function getMockCategory(categoryValue) {
  return MOCK_CATEGORIES.find((cat) => cat.value === categoryValue);
}

export const MOCK_CONTEXT_FILE_CONTENT = `export function waterPlants() {
    console.log('sprinkle');
}`;

export const MOCK_CONTEXT_FILE_DIFF_CONTENT = `diff --git a/src/plants/strawberry.ts b/src/plants/strawberry.ts
index 1234567..8901234 100644
--- a/src/plants/strawberry.ts
+++ b/src/plants/strawberry.ts
@@ -1,4 +1,4 @@
 export const strawberry = {
   name: 'Strawberry',
-  waterNeeds: 'moderate',
+  waterNeeds: 'high',
 };`;

export const MOCK_CONTEXT_ITEM_FILE = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  category: CONTEXT_ITEM_CATEGORY_FILE,
  metadata: {
    enabled: true,
    title: 'strawberry.ts',
    project: 'example/garden',
    relativePath: 'src/plants/strawberry.ts',
  },
};

export const MOCK_CONTEXT_ITEM_FILE_DISABLED = {
  id: '323e4567-e89b-12d3-a456-426614174002',
  category: CONTEXT_ITEM_CATEGORY_FILE,
  metadata: {
    enabled: false,
    title: 'motorbike.cs',
    project: 'example/vehicles',
    relativePath: '/src/VehicleFoo/motorbike.cs',
  },
};
const mockFiles = [
  MOCK_CONTEXT_ITEM_FILE,
  {
    id: '223e4567-e89b-12d3-a456-426614174001',
    category: CONTEXT_ITEM_CATEGORY_FILE,
    metadata: {
      enabled: true,
      title: 'potato.ts',
      project: 'example/garden',
      relativePath: '/src/plants/potato.ts',
    },
  },
  MOCK_CONTEXT_ITEM_FILE_DISABLED,
];

export const MOCK_CONTEXT_ITEM_ISSUE = {
  id: '423e4567-e89b-12d3-a456-426614174003',
  category: CONTEXT_ITEM_CATEGORY_ISSUE,
  metadata: {
    enabled: true,
    title: 'Implement watering schedule',
    project: 'example/garden',
    iid: 1234,
  },
};
export const MOCK_CONTEXT_ITEM_ISSUE_DISABLED = {
  id: 'c463fb31-2a4c-4f8e-a609-97230ac48ae5',
  category: CONTEXT_ITEM_CATEGORY_ISSUE,

  metadata: {
    enabled: false,
    disabledReasons: ['This foo is not available to bar', 'Lorem something something wow?'],
    title: `Fix vehicle colours and make them look real nice and colourful won't that be wonderful wow this issue title is really long I sure hope it's gonna wrap OK`,
    project: 'example/vehicle',
    iid: 91011,
  },
};

const mockIssues = [
  MOCK_CONTEXT_ITEM_ISSUE,
  {
    id: '523e4567-e89b-12d3-a456-426614174004',
    category: CONTEXT_ITEM_CATEGORY_ISSUE,
    metadata: {
      enabled: true,
      title: 'Refactor plant growth rates',
      project: 'example/garden',
      iid: 5678,
    },
  },
  MOCK_CONTEXT_ITEM_ISSUE_DISABLED,
];

export const MOCK_CONTEXT_ITEM_MERGE_REQUEST = {
  id: '623e4567-e89b-12d3-a456-426614174005',
  category: CONTEXT_ITEM_CATEGORY_MERGE_REQUEST,
  metadata: {
    enabled: true,
    title: 'Improve database performance',
    project: 'example/garden',
    iid: 1122,
  },
};
export const MOCK_CONTEXT_ITEM_MERGE_REQUEST_DISABLED = {
  id: '4eb665fc-e5e1-49b0-9789-2a16964e461a',
  category: CONTEXT_ITEM_CATEGORY_MERGE_REQUEST,
  metadata: {
    enabled: false,
    disabledReasons: ['This foo is not available to bar', 'Lorem something something wow?'],
    title: 'Fix broken layout at small viewports',
    project: 'example/vehicle',
    iid: 5566,
  },
};

const mockMergeRequests = [
  MOCK_CONTEXT_ITEM_MERGE_REQUEST,
  {
    id: '723e4567-e89b-12d3-a456-426614174006',
    category: CONTEXT_ITEM_CATEGORY_MERGE_REQUEST,
    metadata: {
      enabled: false,
      disabledReasons: ['This foo is not available to bar', 'Lorem something something wow?'],
      title: 'Add vehicle registration details',
      project: 'example/vehicle',
      iid: 3344,
    },
  },
  MOCK_CONTEXT_ITEM_MERGE_REQUEST_DISABLED,
];

export const MOCK_CONTEXT_ITEM_GIT_DIFF = {
  id: '6d88b466-0c38-48d6-b271-deda47f97cee',
  category: CONTEXT_ITEM_CATEGORY_LOCAL_GIT,
  metadata: {
    enabled: true,
    title: 'Current working changes',
    commitId: 'main',
    repositoryName: 'example/garden',
    gitType: 'diff',
  },
};
export const MOCK_CONTEXT_ITEM_GIT_COMMIT = {
  id: '20f8caf94cb8f5e5f9dbd1a9ac32702321de201b',
  category: CONTEXT_ITEM_CATEGORY_LOCAL_GIT,
  metadata: {
    enabled: true,
    title: 'fix: some bug fix commit',
    commitId: '20f8caf94cb8f5e5f9dbd1a9ac32702321de201b',
    repositoryName: 'example/garden',
    gitType: 'commit',
  },
};

const mockGitItems = [
  MOCK_CONTEXT_ITEM_GIT_DIFF,
  {
    id: 'diff-example/garden',
    category: CONTEXT_ITEM_CATEGORY_LOCAL_GIT,
    metadata: {
      enabled: true,
      title: 'Diff from default branch',
      commitId: 'main',
      repositoryName: 'example/garden',
      gitType: 'diff',
    },
  },
  MOCK_CONTEXT_ITEM_GIT_COMMIT,
  {
    id: '32b9b56b6de75b32909986755fbc470f20fb6fc0',
    category: CONTEXT_ITEM_CATEGORY_LOCAL_GIT,
    metadata: {
      enabled: true,
      title: 'feat: add cool new feature',
      commitId: '32b9b56b6de75b32909986755fbc470f20fb6fc0',
      repositoryName: 'example/garden',
      gitType: 'commit',
    },
  },
  {
    id: '775d7efdce25c1af48c55abcadbefd1f181b92ce',
    category: CONTEXT_ITEM_CATEGORY_LOCAL_GIT,
    metadata: {
      enabled: true,
      title: 'fix: stop foo from bar when baz because customers ding',
      commitId: '775d7efdce25c1af48c55abcadbefd1f181b92ce',
      repositoryName: 'example/garden',
      gitType: 'commit',
    },
  },
];

export const getMockContextItems = () => {
  const allItems = [...mockFiles, ...mockGitItems, ...mockIssues, ...mockMergeRequests];

  // put disabled items in the back
  const disabledItems = allItems.filter((item) => !item.metadata.enabled);
  const enabledItems = allItems.filter((item) => item.metadata.enabled);
  return [...enabledItems, ...disabledItems];
};
