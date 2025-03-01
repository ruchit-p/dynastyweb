'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth, AuthGuard } from '@/components/auth';
import { useToast } from '@/components/ui/use-toast';
import calcTree from "relatives-tree";
import type { Node, ExtNode } from 'relatives-tree/lib/types';
import { api } from "@/lib/api-client";
import { 
  Gender as ApiGender,
  RelativeTreeNode,
  CreateMemberOptions
} from "@/lib/api-client";
import FamilyNode from '@/components/FamilyNode';
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
import { Minus, Plus, RefreshCw } from 'lucide-react';
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
  dateOfBirth?: string;
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
  dateOfBirth?: string;
  dateOfDeath?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  profilePicture?: string;
  [key: string]: unknown;
}

interface ExtendedNodeWithAttributes extends ExtNode {
  attributes?: ExtendedNodeAttributes;
}

type ExtNodeWithId = ExtNode & { id: string };

// Create component-specific logger
const logger = createLogger('FamilyTreePage');

export default function FamilyTreePage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [familyTreeId, setFamilyTreeId] = useState<string>('');
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const DEBUG_MODE = false; // Debug flag - set to true to enable debug features

  // Function to fetch family tree data
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
      setError(null);
      logger.debug('Fetching family tree data', { 
        userId: currentUser.id, 
        method: 'fetchFamilyTreeData'
      });
      
      // Get user data to make sure we have the latest family_tree_id
      const userResponse = await api.auth.getUser();
      
      if (userResponse.error) {
        throw new Error(userResponse.error.message || 'Failed to get user data');
      }
      
      // Get the family tree ID from user response or fall back to user ID
      const userFamilyTreeId = userResponse.data?.family_tree_id || currentUser.id;
      setFamilyTreeId(userFamilyTreeId);
      
      // Fetch family tree data
      const response = await api.familyTree.getFamilyTreeData(userFamilyTreeId, rootNode || undefined);
      
      if (response.error) {
        logger.error('Error fetching family tree data', { 
          error: response.error,
          userId: currentUser.id
        });
        throw new Error(response.error.message || 'Failed to load family tree data');
      }
      
      if (response.data) {
        logger.debug('Family tree data fetched successfully', { 
          nodeCount: response.data.length 
        });
        setTreeData(response.data);
      } else {
        throw new Error('No family tree data returned');
      }
    } catch (error) {
      const errorMsg = (error as Error).message || 'Failed to load family tree';
      setError(errorMsg);
      logger.error('Error in fetchFamilyTreeData', { error });
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser, toast, rootNode]);
  
  // Original data fetching effect
  useEffect(() => {
    fetchFamilyTreeData();
  }, [fetchFamilyTreeData]);

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
  }, [treeData, rootNode, calculateOptimalZoom, DEBUG_MODE]);

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
    if (!selectedNode || !currentUser?.id) {
      setShowDeleteDialog(false);
      return;
    }
    
    try {
      setDeleting(true);
      setDeleteError(null);
      
      logger.debug('Deleting family member', { 
        nodeId: selectedNode.id, 
        treeId: familyTreeId 
      });
      
      // Call the API to delete the member
      const response = await api.familyTree.deleteFamilyMember(selectedNode.id, familyTreeId);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      toast({
        title: "Member Deleted",
        description: "The family member has been removed from the tree.",
      });
      
      // Refresh the tree data
      await fetchFamilyTreeData();
      setShowDeleteDialog(false);
      setSelectedNode(null);
    } catch (error) {
      const errorMsg = (error as Error).message || 'Failed to delete family member';
      setDeleteError(errorMsg);
      logger.error('Error deleting family member', { 
        error,
        nodeId: selectedNode.id
      });
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMsg,
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
      setSelectedNode(null);
    }
  };

  const handleSave = async () => {
    if (!selectedNode || !relationType) {
      logger.error('Missing required data for save', { 
        hasSelectedNode: !!selectedNode, 
        relationType 
      });
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Missing required information. Please try again.',
      });
      return;
    }
    
    // Validate form data
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.gender) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill in the required fields: first name, last name, and gender.',
      });
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
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

      // Create the new family member using the API
      const userData = {
        familyTreeId: familyTreeId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        displayName: `${formData.firstName} ${formData.lastName}`,
        gender: formData.gender as ApiGender,
        dateOfBirth: formData.dateOfBirth,
        email: formData.email,
      };

      const options: CreateMemberOptions = {
        connectToChildren: formData.connectToChildren,
        connectToSpouse: formData.connectToSpouse,
        connectToExistingParent: formData.connectToExistingParent,
      };

      const response = await api.familyTree.createFamilyMember(
        userData,
        relationType,
        selectedNode.id,
        options
      );
      
      // Check for API errors
      if (response.error) {
        throw new Error(response.error.message);
      }

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
      const errorMsg = (error as Error).message || 'Failed to add family member';
      setError(errorMsg);
      logger.error('Error in handleSave', { error, selectedNode: selectedNode.id });
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMsg,
      });
    } finally {
      setSaving(false);
      setIsSheetOpen(false);
      setSelectedNode(null);
      setRelationType(null);
      
      // Reset form data
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
              onClick={() => {
                // Create a default node for the current user
                const userNode: RelativeTreeNode = {
                  id: currentUser.id,
                  gender: ((currentUser as ExtendedUser).gender as ApiGender) || ApiGender.other,
                  parents: [],
                  children: [],
                  siblings: [],
                  spouses: [],
                  attributes: {
                    displayName: (currentUser as ExtendedUser).display_name || currentUser.email,
                    familyTreeId: (currentUser as ExtendedUser).family_tree_id || currentUser.id,
                    firstName: (currentUser as ExtendedUser).first_name,
                    lastName: (currentUser as ExtendedUser).last_name,
                  }
                };
                
                // Format for relatives-tree
                const formattedNode = api.familyTree.formatForRelativesTreeLibrary([userNode]);
                setTreeData(formattedNode as unknown as Node[]);
                setRootNode(currentUser.id);
              }}
            >
              Start Your Family Tree
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div 
        ref={treeContainerRef}
        className="relative flex-1 overflow-hidden"
        onWheel={handleWheel}
      >
        <div
          className="absolute origin-top-left"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            width: treeData.length ? Math.max(calcTree(treeData, { rootId: rootNode, placeholders: false }).canvas.width * WIDTH, window.innerWidth) : '100%',
            height: treeData.length ? Math.max(calcTree(treeData, { rootId: rootNode, placeholders: false }).canvas.height * HEIGHT, window.innerHeight) : '100%',
          }}
        >
          {treeData.length > 0 && (
            <>
              {calcTree(treeData, { rootId: rootNode, placeholders: false }).connectors.map((connector, i) => {
                const key = `connector-${i}`;
                // Handle the connector format from the relatives-tree library
                const [fromX, fromY, toX] = connector;
                
                return (
                  <div
                    key={key}
                    className="absolute bg-gray-400"
                    style={{
                      left: Math.min(fromX * WIDTH + WIDTH / 2, toX * WIDTH + WIDTH / 2),
                      top: fromY * HEIGHT + HEIGHT / 2,
                      width: Math.abs((fromX - toX) * WIDTH),
                      height: 2,
                    }}
                  />
                );
              })}
              
              {calcTree(treeData, { rootId: rootNode, placeholders: false }).nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                
                return (
                  <div
                    key={node.id}
                    className="absolute"
                    style={{
                      left: node.left * WIDTH,
                      top: node.top * HEIGHT,
                      width: WIDTH,
                      height: HEIGHT,
                    }}
                    onClick={() => handleNodeClick(node, true)}
                  >
                    <FamilyNode
                      node={node as ExtendedNodeWithAttributes}
                      isSelected={isSelected}
                    />
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    );
  };

  // Add refresh button to the UI
  const renderRefreshButton = () => {
    return (
      <Button 
        variant="outline" 
        size="icon" 
        onClick={() => fetchFamilyTreeData()} 
        disabled={loading}
        className="fixed top-20 right-4 z-10"
      >
        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
      </Button>
    );
  };

  return (
    <AuthGuard>
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
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>
                {relationType === 'parent' && 'Add Parent'}
                {relationType === 'spouse' && 'Add Spouse'}
                {relationType === 'child' && 'Add Child'}
                {relationType === 'sibling' && 'Add Sibling'}
              </SheetTitle>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="firstName" className="text-right flex justify-end items-center gap-1">
                  First Name <span className="text-red-500">*</span>
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
                  Last Name <span className="text-red-500">*</span>
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
                  Gender <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger id="gender" className="col-span-3" tabIndex={3}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ApiGender.male}>Male</SelectItem>
                    <SelectItem value={ApiGender.female}>Female</SelectItem>
                    <SelectItem value={ApiGender.other}>Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dateOfBirth" className="text-right">
                  Date of Birth
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  className="col-span-3"
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }));
                  }}
                  tabIndex={4}
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
                  value={formData.email || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  tabIndex={5}
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

        {renderRefreshButton()}
      </main>
    </AuthGuard>
  );
} 