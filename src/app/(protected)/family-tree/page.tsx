'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/components/auth';
import { useToast } from '@/components/ui/use-toast';
import calcTree from "relatives-tree";
import type { Node, ExtNode, Connector } from 'relatives-tree/lib/types';
import { 
  getFamilyTreeData, 
  createFamilyMember as createFamilyMemberApi, 
  deleteFamilyMember as deleteFamilyMemberApi, 
  Gender as ApiGender,
  UserData,
  CreateMemberOptions,
  convertToRelativesTreeFormat
} from "@/lib/api/family-tree";
import FamilyNode from '@/components/FamilyNode';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Minus, Plus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { createLogger } from '@/lib/client/logger';

const WIDTH = 150;
const HEIGHT = 150;

type RelationType = 'parent' | 'spouse' | 'child' | 'sibling';

interface AddMemberFormData {
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  gender: string;
  phone?: string;
  email?: string;
  connectToChildren?: boolean;
  connectToSpouse?: boolean;
  connectToExistingParent?: boolean;
}

// Extended User type that includes the required properties
interface ExtendedUser {
  id: string;
  gender?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  email?: string;
  family_tree_id?: string;
}

// Extended node type with custom attributes
interface ExtendedNodeAttributes {
  familyTreeId?: string;
  displayName?: string;
  isBloodRelated?: boolean;
  treeOwnerId?: string;
  status?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: Date;
  [key: string]: unknown;
}

interface ExtendedNodeWithAttributes extends ExtNode {
  attributes?: ExtendedNodeAttributes;
}

// Create component-specific logger
const logger = createLogger('FamilyTreePage');

export default function FamilyTreePage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [treeData, setTreeData] = useState<Node[]>([]);
  const [selectedNode, setSelectedNode] = useState<ExtendedNodeWithAttributes | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [relationType, setRelationType] = useState<RelationType | null>(null);
  const [formData, setFormData] = useState<AddMemberFormData>({
    firstName: '',
    lastName: '',
    dateOfBirth: undefined,
    gender: '',
    phone: '',
    email: '',
    connectToChildren: true,
    connectToSpouse: true,
    connectToExistingParent: true,
  });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rootNode, setRootNode] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const DEBUG_MODE = false; // Debug flag - set to true to enable debug features

  const fetchFamilyTreeData = useCallback(async () => {
    if (!currentUser?.id) {
      logger.warn('No current user ID available', { 
        component: 'FamilyTreePage',
        method: 'fetchFamilyTreeData'
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      logger.debug('Fetching family tree data', { 
        userId: currentUser.id, 
        method: 'fetchFamilyTreeData'
      });
      
      // Get the family tree ID from user or fall back to user ID
      const familyTreeId = (currentUser as ExtendedUser).family_tree_id || currentUser.id;
      
      // Fetch tree data from API
      const data = await getFamilyTreeData(familyTreeId);
      
      logger.debug('Family tree data fetched successfully', {
        userId: currentUser.id,
        nodeCount: data.nodes?.length || 0,
        method: 'fetchFamilyTreeData'
      });
      
      if (data && data.nodes && data.nodes.length > 0) {
        // Use the converter function to properly format nodes
        const convertedNodes = convertToRelativesTreeFormat(data.nodes);
        
        // Update state with properly formatted data
        setTreeData(convertedNodes as unknown as Node[]);
        
        // Set root node ID from the API response or default to first node
        if (data.rootId) {
          setRootNode(data.rootId);
        } else if (convertedNodes.length > 0) {
          setRootNode(convertedNodes[0].id);
        }
      } else {
        // Handle empty tree case
        setTreeData([]);
        logger.debug('No family tree nodes found', { 
          userId: currentUser.id, 
          method: 'fetchFamilyTreeData'
        });
      }
    } catch (error) {
      logger.error('Error fetching family tree data', {
        userId: currentUser?.id,
        error: error instanceof Error ? error.message : String(error),
        method: 'fetchFamilyTreeData'
      });
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load family tree data. Please try again.",
        variant: "destructive",
      });
      setTreeData([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, toast]);

  // Add debug logging for currentUser changes
  useEffect(() => {
    if (currentUser) {
      logger.debug('Current user state updated', {
        userId: currentUser.id,
        isAuthenticated: !!currentUser,
        emailVerified: currentUser.email_confirmed_at ? true : false,
        component: 'FamilyTreePage'
      });
    } else {
      logger.debug('Current user is null or undefined', {
        component: 'FamilyTreePage'
      });
    }
  }, [currentUser]);
  
  // Original data fetching effect
  useEffect(() => {
    fetchFamilyTreeData();
  }, [fetchFamilyTreeData]);

  // Debug effect to track currentUser changes
  useEffect(() => {
    if (DEBUG_MODE) {
      console.log('currentUser state changed:', {
        userId: currentUser?.id || 'no user',
        hasUser: !!currentUser,
        timestamp: new Date().toISOString()
      });
    }
  }, [currentUser, DEBUG_MODE]);

  // Update rootNode when user changes
  useEffect(() => {
    if (currentUser?.id) {
      console.log('Setting root node to current user:', currentUser.id);
      setRootNode(currentUser.id);
    }
  }, [currentUser?.id]);

  // Calculate optimal zoom level to fit the entire tree
  const calculateOptimalZoom = useCallback(() => {
    if (treeData.length === 0) return 1;

    const headerHeight = 80;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - headerHeight;

    const layout = calcTree(treeData, {
      rootId: rootNode,
      placeholders: false
    });

    // Calculate the total tree dimensions
    const treeWidth = layout.canvas.width * WIDTH;
    const treeHeight = layout.canvas.height * HEIGHT;

    // Calculate scale needed for both width and height
    const scaleX = (viewportWidth * 0.9) / treeWidth; // 90% of viewport width
    const scaleY = (viewportHeight * 0.9) / treeHeight; // 90% of viewport height

    // Use the smaller scale to ensure the entire tree fits
    const optimalScale = Math.min(scaleX, scaleY);

    // Clamp the scale between 0.1 and 1
    return Math.min(Math.max(optimalScale, 0.1), 1);
  }, [treeData, rootNode]);

  // Effect to set initial zoom and center tree when data is loaded
  useEffect(() => {
    if (treeData.length > 0) {
      const optimalScale = calculateOptimalZoom();
      setScale(optimalScale);

      const headerHeight = 80;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight - headerHeight;

      const layout = calcTree(treeData, {
        rootId: rootNode,
        placeholders: false
      });

      const treeWidth = layout.canvas.width * WIDTH;
      const treeHeight = layout.canvas.height * HEIGHT;

      const x = (viewportWidth - treeWidth * optimalScale) / 2;
      const y = (viewportHeight - treeHeight * optimalScale) / 2;

      if (DEBUG_MODE) {
        console.log('Initial centering debug:', {
          viewport: { width: viewportWidth, height: viewportHeight },
          tree: { 
            width: treeWidth, 
            height: treeHeight,
            scaledWidth: treeWidth * optimalScale,
            scaledHeight: treeHeight * optimalScale,
            scale: optimalScale
          },
          position: { x, y },
          layout: {
            canvasWidth: layout.canvas.width,
            canvasHeight: layout.canvas.height,
            nodeCount: layout.nodes.length
          }
        });
      }

      setPosition({ x, y });
    }
  }, [treeData, calculateOptimalZoom, rootNode, DEBUG_MODE]);

  // Function to center the tree or a specific node
  const centerTree = useCallback((nodeId?: string) => {
    if (treeData.length === 0) return;

    const headerHeight = 80;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - headerHeight;
    const minTopMargin = 100; // Minimum distance from top of viewport

    const layout = calcTree(treeData, {
      rootId: nodeId || rootNode,
      placeholders: false
    });

    if (nodeId) {
      // Find the specific node to center
      const targetNode = layout.nodes.find(n => n.id === nodeId);
      if (targetNode) {
        // Calculate the absolute position of the node in the tree
        const nodeX = targetNode.left * WIDTH;
        const nodeY = targetNode.top * HEIGHT;

        // Center horizontally
        const x = viewportWidth / 2 - nodeX * scale;
        
        // For vertical positioning, ensure the node isn't too close to the top
        let y = viewportHeight / 2 - nodeY * scale;
        
        // If the node would be positioned above minTopMargin, adjust y to maintain minimum margin
        const nodeScreenY = nodeY * scale + y;
        if (nodeScreenY < minTopMargin) {
          y += (minTopMargin - nodeScreenY);
        }

        setPosition({ x, y });
      }
    } else {
      // For initial tree centering, calculate the center point of the tree
      const treeWidth = layout.canvas.width * WIDTH * scale;
      const treeHeight = layout.canvas.height * HEIGHT * scale;

      // Position the tree in the center of the viewport
      const x = (viewportWidth - treeWidth) / 2;
      let y = (viewportHeight - treeHeight) / 2;

      // Ensure the top of the tree isn't too close to the top of the viewport
      if (y < minTopMargin) {
        y = minTopMargin;
      }

      setPosition({ x, y });
    }
  }, [treeData, rootNode, scale]);

  // Effect to center tree on initial load and when tree data changes
  useEffect(() => {
    centerTree();
  }, [treeData, scale, centerTree]);

  // Effect to handle centering when root node changes
  useEffect(() => {
    if (!rootNode || treeData.length === 0) return;

    const layout = calcTree(treeData, {
      rootId: rootNode,
      placeholders: false
    });

    const targetNode = layout.nodes.find(n => n.id === rootNode);
    if (!targetNode) return;

    const headerHeight = 80;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - headerHeight;
    const viewportCenterX = viewportWidth / 2;
    const viewportCenterY = viewportHeight / 2;

    const nodeX = targetNode.left * WIDTH;
    const nodeY = targetNode.top * HEIGHT;

    const x = viewportCenterX - (nodeX * scale);
    const y = viewportCenterY - (nodeY * scale);

    if (DEBUG_MODE) {
      console.log('Node centering debug:', {
        node: {
          id: rootNode,
          left: targetNode.left,
          top: targetNode.top,
          absoluteX: nodeX,
          absoluteY: nodeY,
          screenX: nodeX * scale + x,
          screenY: nodeY * scale + y
        },
        viewport: {
          width: viewportWidth,
          height: viewportHeight,
          centerX: viewportCenterX,
          centerY: viewportCenterY
        },
        scale,
        position: { x, y },
        layout: {
          canvasWidth: layout.canvas.width,
          canvasHeight: layout.canvas.height,
          nodeCount: layout.nodes.length
        }
      });
    }

    setPosition({ x, y });
  }, [rootNode, treeData, scale, DEBUG_MODE]);

  // Add debug info for tree wrapper dimensions
  const getTreeWrapperDebugInfo = useCallback(() => {
    if (!treeData.length) return null;

    const layout = calcTree(treeData, {
      rootId: rootNode,
      placeholders: false
    });

    return {
      wrapperWidth: Math.max(layout.canvas.width * WIDTH, window.innerWidth),
      wrapperHeight: Math.max(layout.canvas.height * HEIGHT, window.innerHeight),
      transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
      layout: {
        canvasWidth: layout.canvas.width,
        canvasHeight: layout.canvas.height,
        nodeCount: layout.nodes.length
      }
    };
  }, [treeData, rootNode, position.x, position.y, scale]);

  // Log wrapper debug info whenever position or scale changes
  useEffect(() => {
    if (DEBUG_MODE) {
      const debugInfo = getTreeWrapperDebugInfo();
      if (debugInfo) {
        console.log('Tree wrapper debug:', debugInfo);
      }
    }
  }, [DEBUG_MODE, getTreeWrapperDebugInfo]);

  const handleNodeClick = (node: ExtNode, isClick: boolean) => {
    if (!isClick) return;

    if (selectedNode?.id === node.id) {
      setSelectedNode(null);
      return;
    }
    
    if (DEBUG_MODE) {
      console.log('Node click debug:', {
        clickedNode: {
          id: node.id,
          position: node.left && node.top ? { left: node.left * WIDTH, top: node.top * HEIGHT } : null
        },
        currentScale: scale,
        currentPosition: position
      });
    }
    
    setSelectedNode(node as ExtendedNodeWithAttributes);
    setRootNode(node.id);
  };

  const handleAddMember = (type: RelationType) => {
    setRelationType(type);
    setIsSheetOpen(true);
  };

  const canDeleteMember = (node: ExtNode): boolean => {
    // Can't delete self
    if (node.id === currentUser?.id) return false;

    const isLeafMember = (member: Node): boolean => {
      // If this member has no children, they are a leaf
      if (!member.children || member.children.length === 0) return true;

      // Check if all children are also leaves
      return member.children.every(child => {
        const childNode = treeData.find(n => n.id === child.id);
        return childNode ? isLeafMember(childNode) : true;
      });
    };

    // Find the full node data from treeData
    const fullNode = treeData.find(n => n.id === node.id);
    if (!fullNode) return false;

    // Check if the node is a leaf in the tree
    const isLeaf = isLeafMember(fullNode);
    
    // If the member has an account (status !== 'pending'), only tree owner can delete
    const memberData = (fullNode as ExtendedNodeWithAttributes).attributes;
    const hasAccount = memberData?.status && memberData.status !== 'pending';
    const isOwner = currentUser?.id === memberData?.treeOwnerId;

    if (hasAccount && !isOwner) {
      setDeleteError(
        "Cannot delete members with active accounts. Only the tree owner can remove members with accounts."
      );
      return false;
    }

    if (!isLeaf) {
      setDeleteError(
        "This member has descendants in the family tree. Please remove all descendants first."
      );
      return false;
    }

    return true;
  };

  const handleDeleteMember = async () => {
    if (!selectedNode || !currentUser) return;
    
    try {
      setSaving(true);
      
      // Get the family tree ID from the selected node or user
      const familyTreeId = 
        selectedNode.attributes?.familyTreeId || 
        ((currentUser as ExtendedUser).family_tree_id || currentUser.id);
      
      // Call the API to delete the member
      await deleteFamilyMemberApi(selectedNode.id, familyTreeId);
      
      toast({
        title: "Member Deleted",
        description: "The family member has been removed from the tree.",
      });
      
      // Refresh the tree data
      await fetchFamilyTreeData();
      setShowDeleteDialog(false);
      setSelectedNode(null);
    } catch (error) {
      console.error("Error deleting family member:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete family member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setDeleteError(null);
    }
  };

  const handleSave = async () => {
    if (!selectedNode || !currentUser || !relationType) return;
    
    // Form validation
    if (!formData.firstName.trim()) {
      toast({
        title: "Error",
        description: "First name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.lastName.trim()) {
      toast({
        title: "Error",
        description: "Last name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.gender) {
      toast({
        title: "Error",
        description: "Gender is required.",
        variant: "destructive",
      });
      return;
    }

    // Find the family tree ID from the selected node or user
    const familyTreeId = 
      selectedNode.attributes?.familyTreeId || 
      (currentUser as ExtendedUser).family_tree_id || 
      currentUser.id;
    
    if (!familyTreeId) {
      toast({
        title: "Error",
        description: "Family tree ID not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      // Create the new family member using the API
      const userData: UserData = {
        familyTreeId,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        displayName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        gender: formData.gender === 'male' ? ApiGender.male : ApiGender.female,
        attributes: {
          dateOfBirth: formData.dateOfBirth || new Date(),
          status: 'pending',
          phone: formData.phone?.trim(),
          email: formData.email?.trim(),
        }
      };

      const options: CreateMemberOptions = {
        connectToChildren: formData.connectToChildren,
        connectToSpouse: formData.connectToSpouse,
        connectToExistingParent: formData.connectToExistingParent,
      };

      await createFamilyMemberApi(
        userData,
        relationType,
        selectedNode.id,
        options
      );

      // Refresh the tree data
      await fetchFamilyTreeData();
      
      toast({
        title: "Success",
        description: "New family member has been added to the tree.",
      });

      // Reset form and close sheet
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: undefined,
        gender: '',
        phone: '',
        email: '',
        connectToChildren: true,
        connectToSpouse: true,
        connectToExistingParent: true,
      });
      setSelectedNode(null);
      setRelationType(null);
      setIsSheetOpen(false);
    } catch (error) {
      console.error("Error adding family member:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add family member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!treeContainerRef.current) return;

    // Get the current scroll position
    const currentX = position.x;
    const currentY = position.y;

    // Calculate new position based on wheel movement
    // For diagonal scrolling support, we use both deltaX and deltaY
    const newX = currentX - e.deltaX;
    const newY = currentY - e.deltaY;

    // Update position
    setPosition({ x: newX, y: newY });
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.1));
  };

  // Add a debug handler to test the new API directly
  const testDirectApi = useCallback(async () => {
    if (!currentUser?.id) {
      toast({
        title: "Error",
        description: "No user found.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Use the new API module to fetch family tree data
      const familyTreeId = (currentUser as ExtendedUser).family_tree_id || currentUser.id;
      const data = await getFamilyTreeData(familyTreeId);
      
      console.log('Direct API response:', data);
      toast({
        title: "API Test Success",
        description: `Retrieved ${data.nodes?.length || 0} nodes from the API`,
      });
    } catch (error) {
      console.error('Error testing API:', error);
      toast({
        title: "API Test Failed",
        description: error instanceof Error ? error.message : "Failed to call the API directly",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser, toast]);

  // Function to render the tree based on the current state
  const renderTree = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Spinner />
        </div>
      );
    }

    if (!currentUser?.id) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full gap-4">
          <h2 className="text-xl font-semibold">Not Authenticated</h2>
          <p className="text-gray-600">Please sign in to view your family tree.</p>
        </div>
      );
    }

    if (treeData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full gap-4">
          <h2 className="text-xl font-semibold">No Family Tree Data</h2>
          <p className="text-gray-600">Your family tree is empty. Start by adding family members.</p>
          <div className="mt-4">
            <Button
              variant="default"
              onClick={async () => {
                try {
                  // Create a family tree via the API
                  const response = await fetch('/api/family-tree/create', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                  });
                  
                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to create family tree');
                  }
                  
                  const data = await response.json();
                  
                  // Set up the initial user node with the new tree ID
                  const user = currentUser as ExtendedUser;
                  const userNode = {
                    id: user.id,
                    gender: user.gender === 'male' ? 'male' : 'female',
                    left: 0, top: 0,
                    hasSubTree: false,
                    parents: [],
                    siblings: [],
                    spouses: [],
                    children: [],
                    attributes: {
                      familyTreeId: data.treeId,
                      displayName: user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.id,
                      isBloodRelated: true,
                      treeOwnerId: user.id
                    }
                  };
                  
                  // Update the user's family tree ID in the database if needed
                  if (!user.family_tree_id) {
                    // You might want to add an API call here to update the user's family_tree_id
                  }
                  
                  setSelectedNode(userNode as ExtendedNodeWithAttributes);
                  setRelationType('child');
                  setIsSheetOpen(true);
                  
                  // Refresh the tree data
                  await fetchFamilyTreeData();
                  
                  toast({
                    title: "Family Tree Created",
                    description: "Your family tree has been created. Add your first family member to get started.",
                    variant: "default",
                  });
                } catch (error) {
                  console.error('Error creating family tree:', error);
                  toast({
                    title: "Error",
                    description: error instanceof Error ? error.message : "Failed to create family tree. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Create Your Family Tree
            </Button>
          </div>
        </div>
      );
    }

    // Calculate tree layout only if treeData is available
    const treeLayout = treeData && treeData.length > 0 
      ? calcTree(treeData, {
          rootId: rootNode,
          placeholders: false
        })
      : null;

    return (
      <div 
        ref={treeContainerRef}
        className="absolute inset-0 overflow-hidden"
        onWheel={handleWheel}
      >
        <div
          className="tree-wrapper absolute"
          style={{
            width: treeLayout ? `${treeLayout.canvas.width * WIDTH}px` : '0px',
            height: treeLayout ? `${treeLayout.canvas.height * HEIGHT}px` : '0px',
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: 'transform 0.2s ease-out',
            transformOrigin: '0 0',
            left: 0,
            top: 0
          }}
        >
          {/* Render connectors first so they appear behind nodes */}
          {treeLayout && treeLayout.connectors.map((connector: Connector, index: number) => {
            const [x1, y1, x2, y2] = connector;
            const key = `connector-${index}`;

            // Calculate centered coordinates
            const startX = x1 * WIDTH - (WIDTH / 2);
            const startY = y1 * HEIGHT - (HEIGHT / 2.5);
            const endX = x2 * WIDTH - (WIDTH / 2);
            const endY = y2 * HEIGHT - (HEIGHT / 2.5);

            return (
              <div
                key={key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  overflow: 'visible',
                }}
              >
                <svg
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    overflow: 'visible',
                    pointerEvents: 'none',
                  }}
                >
                  <path
                    d={`M ${startX} ${startY} L ${endX} ${endY}`}
                    stroke="#94a3b8"
                    strokeWidth="1"
                    fill="none"
                  />
                </svg>
              </div>
            );
          })}

          {/* Render nodes on top of connectors */}
          {treeLayout && treeLayout.nodes.map((node: ExtNode) => (
            <div
              key={node.id}
              onMouseDown={(e) => {
                handleNodeClick(node, true);
                e.stopPropagation();
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
              }}
              onMouseMove={(e) => {
                handleNodeClick(node, false);
                e.stopPropagation();
              }}
              className="cursor-pointer absolute"
              style={{
                left: node.left * WIDTH,
                top: node.top * HEIGHT,
                width: WIDTH,
                height: HEIGHT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FamilyNode
                node={node}
                isSelected={selectedNode?.id === node.id}
                style={{
                  width: WIDTH - 20,
                  height: HEIGHT - 40,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <main className="family-tree-container w-screen min-h-screen pt-20 flex items-center justify-center overflow-hidden relative">
        {/* Debug center point */}
        {DEBUG_MODE && (
          <div 
            className="fixed w-4 h-4 bg-red-500 rounded-full z-50"
            style={{ 
              left: '50%', 
              top: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none'
            }} 
          />
        )}
        
        {/* Zoom Controls */}
        <div className="fixed bottom-8 right-8 flex flex-col gap-2 z-20">
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            className="rounded-full h-10 w-10"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            className="rounded-full h-10 w-10"
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>

        {/* Center Tree Button */}
        <div className="fixed bottom-8 left-8 z-20">
          <Button
            variant="outline"
            onClick={() => centerTree()}
            className="rounded-full"
          >
            Center Tree
          </Button>
        </div>

        {selectedNode && (
          <div className="fixed top-20 right-4 z-10 py-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default">Add Family Member</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => handleAddMember('parent')}>
                  Add Parent
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleAddMember('spouse')}>
                  Add Spouse
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleAddMember('child')}>
                  Add Child
                </DropdownMenuItem>
                {selectedNode.id !== currentUser?.id && (
                  <DropdownMenuItem
                    className={cn(
                      "text-red-600",
                      !canDeleteMember(selectedNode) && "opacity-50 cursor-not-allowed"
                    )}
                    onSelect={() => {
                      if (canDeleteMember(selectedNode)) {
                        setShowDeleteDialog(true);
                      } else {
                        setDeleteError("Cannot delete members who have children. Please remove all children first.");
                        toast({
                          variant: "destructive",
                          title: "Cannot Delete Member",
                          description: "Members with children cannot be deleted. Please remove all children first."
                        });
                      }
                    }}
                  >
                    Delete Member
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="sm:max-w-[425px]">
            <SheetHeader>
              <SheetTitle>Add {relationType?.charAt(0).toUpperCase()}{relationType?.slice(1)}</SheetTitle>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="firstName" className="text-right flex justify-end items-center gap-1">
                  First Name<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  className="col-span-3"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  tabIndex={1}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lastName" className="text-right flex justify-end items-center gap-1">
                  Last Name<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  className="col-span-3"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  tabIndex={2}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="gender" className="text-right flex justify-end items-center gap-1">
                  Gender<span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger className="col-span-3" tabIndex={3}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dateOfBirth" className="text-right">
                  Date of Birth
                </Label>
                <div className="col-span-3 flex gap-2">
                  <Select
                    value={formData.dateOfBirth?.getMonth()?.toString()}
                    onValueChange={(value) => {
                      const newDate = formData.dateOfBirth || new Date();
                      newDate.setMonth(parseInt(value));
                      setFormData(prev => ({ ...prev, dateOfBirth: new Date(newDate) }));
                    }}
                  >
                    <SelectTrigger className="w-[110px]" tabIndex={4}>
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {new Date(0, i).toLocaleString('default', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={formData.dateOfBirth?.getDate()?.toString()}
                    onValueChange={(value) => {
                      const newDate = formData.dateOfBirth || new Date();
                      newDate.setDate(parseInt(value));
                      setFormData(prev => ({ ...prev, dateOfBirth: new Date(newDate) }));
                    }}
                  >
                    <SelectTrigger className="w-[90px]" tabIndex={5}>
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => (
                        <SelectItem key={i} value={(i + 1).toString()}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={formData.dateOfBirth?.getFullYear()?.toString()}
                    onValueChange={(value) => {
                      const newDate = formData.dateOfBirth || new Date();
                      newDate.setFullYear(parseInt(value));
                      setFormData(prev => ({ ...prev, dateOfBirth: new Date(newDate) }));
                    }}
                  >
                    <SelectTrigger className="w-[100px]" tabIndex={6}>
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 121 }, (_, i) => (
                        <SelectItem key={i} value={(new Date().getFullYear() - i).toString()}>
                          {new Date().getFullYear() - i}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Phone 
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  className="col-span-3"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  tabIndex={7}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email 
                </Label>
                <Input
                  id="email"
                  type="email"
                  className="col-span-3"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  tabIndex={8}
                />
              </div>
              {relationType === 'spouse' && (selectedNode?.children?.length ?? 0) > 0 && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="connectToChildren" className="text-right">
                    Connect to Children
                  </Label>
                  <div className="col-span-3 flex items-center">
                    <input
                      type="checkbox"
                      id="connectToChildren"
                      className="mr-2"
                      checked={formData.connectToChildren}
                      onChange={(e) => setFormData(prev => ({ ...prev, connectToChildren: e.target.checked }))}
                    />
                    <Label htmlFor="connectToChildren">
                      Connect to spouse&apos;s existing children
                    </Label>
                  </div>
                </div>
              )}
              {relationType === 'child' && (selectedNode?.spouses?.length ?? 0) > 0 && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="connectToSpouse" className="text-right">
                    Connect to Spouse
                  </Label>
                  <div className="col-span-3 flex items-center">
                    <input
                      type="checkbox"
                      id="connectToSpouse"
                      className="mr-2"
                      checked={formData.connectToSpouse}
                      onChange={(e) => setFormData(prev => ({ ...prev, connectToSpouse: e.target.checked }))}
                    />
                    <Label htmlFor="connectToSpouse">
                      Add child to spouse as well
                    </Label>
                  </div>
                </div>
              )}
              {relationType === 'parent' && (selectedNode?.parents?.length ?? 0) > 0 && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="connectToExistingParent" className="text-right">
                    Connect Parents
                  </Label>
                  <div className="col-span-3 flex items-center">
                    <input
                      type="checkbox"
                      id="connectToExistingParent"
                      className="mr-2"
                      checked={formData.connectToExistingParent}
                      onChange={(e) => setFormData(prev => ({ ...prev, connectToExistingParent: e.target.checked }))}
                    />
                    <Label htmlFor="connectToExistingParent">
                      Connect as spouse to existing parent
                    </Label>
                  </div>
                </div>
              )}
            </div>
            <SheetFooter>
              <Button
                variant="outline"
                onClick={() => setIsSheetOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
                Save
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {renderTree()}

        <AlertDialog 
          open={showDeleteDialog} 
          onOpenChange={(open) => {
            setShowDeleteDialog(open);
            if (!open) setDeleteError(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to remove this family member?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently remove this member from your family tree.
                {deleteError && (
                  <p className="mt-2 text-red-600">{deleteError}</p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteMember}
                disabled={saving || !!deleteError}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {saving ? "Removing..." : "Remove Member"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Debug button if debug mode is enabled */}
        {DEBUG_MODE && (
          <div className="absolute top-4 right-4 z-50">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={testDirectApi}
              disabled={loading}
              className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800"
            >
              Test Direct API
            </Button>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
} 