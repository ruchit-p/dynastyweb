'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import calcTree from "relatives-tree";
import type { Node, ExtNode, Connector } from 'relatives-tree/lib/types';
import { getFamilyTreeData, createFamilyMember, deleteFamilyMember } from "@/utils/functionUtils";
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

const WIDTH = 150;
const HEIGHT = 150;

type RelationType = 'parent' | 'spouse' | 'child';

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

// Custom node type that extends the base Node type
interface CustomNode extends Omit<Node, 'placeholder'> {
  attributes?: {
    displayName: string;
    profilePicture?: string;
    familyTreeId: string;
    isBloodRelated: boolean;
    status?: string;
    treeOwnerId?: string;
  };
}

export default function FamilyTreePage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [treeData, setTreeData] = useState<Node[]>([]);
  const [selectedNode, setSelectedNode] = useState<ExtNode | null>(null);
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
  const [rootNode, setRootNode] = useState<string>(currentUser?.uid || '');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const DEBUG_MODE = false; // Debug flag - set to true to enable debug features

  const fetchFamilyTreeData = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const { treeNodes } = await getFamilyTreeData(currentUser.uid);
      setTreeData([...treeNodes]); // Convert readonly array to mutable array
    } catch {
      toast({
        title: "Error",
        description: "Failed to load family tree. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    void fetchFamilyTreeData();
  }, [fetchFamilyTreeData]);

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
    
    setSelectedNode(node);
    setRootNode(node.id);
  };

  const handleAddMember = (type: RelationType) => {
    setRelationType(type);
    setIsSheetOpen(true);
  };

  const canDeleteMember = (node: ExtNode): boolean => {
    // Can't delete self
    if (node.id === currentUser?.uid) return false;

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
    const memberData = (fullNode as CustomNode).attributes;
    const hasAccount = memberData?.status && memberData.status !== 'pending';
    const isOwner = currentUser?.uid === memberData?.treeOwnerId;

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
    if (!selectedNode || !currentUser || selectedNode.id === currentUser.uid) return;
    const node = selectedNode as CustomNode;

    if (!canDeleteMember(selectedNode)) {
      setDeleteError("Cannot delete members who have children. Please remove all children first.");
      return;
    }

    try {
      setSaving(true);
      
      if (!node.attributes?.familyTreeId) {
        throw new Error('Family tree ID not found');
      }

      await deleteFamilyMember(
        node.id,
        node.attributes.familyTreeId,
        currentUser.uid
      );

      toast({
        title: "Member Deleted",
        description: "The family member has been removed from the tree.",
      });
      await fetchFamilyTreeData();
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Error deleting family member:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete family member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setSelectedNode(null);
      setDeleteError(null);
    }
  };

  const handleSave = async () => {
    if (!selectedNode || !currentUser || !relationType) return;
    const node = selectedNode as CustomNode;

    // Validate required fields
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

    if (!node.attributes?.familyTreeId) {
      toast({
        title: "Error",
        description: "Family tree ID not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      // Create the new family member using the Cloud Function
      const userData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        displayName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        dateOfBirth: formData.dateOfBirth || new Date(),
        gender: formData.gender,
        status: 'pending',
        familyTreeId: node.attributes.familyTreeId,
        phone: formData.phone?.trim(),
        email: formData.email?.trim(),
      };

      await createFamilyMember(
        userData,
        relationType,
        node.id,
        {
          connectToChildren: formData.connectToChildren,
          connectToSpouse: formData.connectToSpouse,
          connectToExistingParent: formData.connectToExistingParent,
        }
      );

      // Fetch updated tree data before closing the sheet
      await fetchFamilyTreeData();
      
      toast({
        title: "Success",
        description: "New family member has been added to the tree.",
      });

      // Reset form and close sheet after data is refreshed
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
        description: "Failed to add family member. Please try again.",
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

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="family-tree-container w-screen">
          <div className="flex items-center justify-center w-full h-full">
            <Spinner className="text-primary" />
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (!currentUser) {
    return (
      <ProtectedRoute>
        <main className="family-tree-container w-screen">
          <div className="flex flex-col items-center justify-center w-full h-full gap-4">
            <h2 className="text-xl font-semibold">Not Authenticated</h2>
            <p className="text-gray-600">Please sign in to view your family tree.</p>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

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
                {selectedNode.id !== currentUser?.uid && (
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

        {treeData.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full h-full gap-4">
            <h2 className="text-xl font-semibold">No Family Tree Data</h2>
            <p className="text-gray-600">Your family tree is empty. Start by adding family members.</p>
          </div>
        ) : (
          <div 
            ref={treeContainerRef}
            className="absolute inset-0 overflow-hidden"
            onWheel={handleWheel}
          >
            <div 
              className="tree-wrapper absolute"
              style={{
                width: `${calcTree(treeData, {
                  rootId: rootNode,
                  placeholders: false
                }).canvas.width * WIDTH}px`,
                height: `${calcTree(treeData, {
                  rootId: rootNode,
                  placeholders: false
                }).canvas.height * HEIGHT}px`,
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transition: 'transform 0.2s ease-out',
                transformOrigin: '0 0',
                left: 0,
                top: 0
              }}
            >
              {/* Render connectors first so they appear behind nodes */}
              {calcTree(treeData, {
                rootId: rootNode,
                placeholders: false
              }).connectors.map((connector: Connector, index: number) => {
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
              {calcTree(treeData, {
                rootId: rootNode,
                placeholders: false
              }).nodes.map((node: ExtNode) => (
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
        )}

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
      </main>
    </ProtectedRoute>
  );
} 